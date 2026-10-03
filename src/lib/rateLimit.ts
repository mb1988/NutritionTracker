import { Redis } from "ioredis";
import { AppError } from "@/server/errors";

/**
 * Fixed-window rate limiter.
 *
 * With REDIS_URL set, counters live in Redis so every app instance shares
 * them. Without it (the single-instance default), counters live in this
 * process's memory and reset on restart. If Redis is configured but
 * unreachable, requests fall back to the in-memory counters rather than
 * failing.
 */

type WindowEntry = { count: number; resetAt: number };

const memoryStore = new Map<string, WindowEntry>();

/** Drop expired windows now and then so per-IP keys don't accumulate forever. */
const PRUNE_EVERY_N_CALLS = 500;
let callsSincePrune = 0;

function pruneExpired(now: number) {
  for (const [key, entry] of memoryStore) {
    if (now >= entry.resetAt) memoryStore.delete(key);
  }
}

/** Returns the request count in the current window, including this one. */
export function incrementInMemory(key: string, windowMs: number, now = Date.now()): number {
  if (++callsSincePrune >= PRUNE_EVERY_N_CALLS) {
    callsSincePrune = 0;
    pruneExpired(now);
  }

  const entry = memoryStore.get(key);
  if (!entry || now >= entry.resetAt) {
    memoryStore.set(key, { count: 1, resetAt: now + windowMs });
    return 1;
  }

  entry.count += 1;
  return entry.count;
}

let redisClient: Redis | null | undefined;

function getRedis(): Redis | null {
  if (redisClient !== undefined) return redisClient;

  const url = process.env.REDIS_URL;
  if (!url) {
    redisClient = null;
    return null;
  }

  redisClient = new Redis(url, {
    lazyConnect: true,
    maxRetriesPerRequest: 1,
    enableOfflineQueue: false,
  });
  redisClient.on("error", (error) => {
    console.warn("[rateLimit] Redis error:", error.message);
  });
  return redisClient;
}

async function incrementInRedis(redis: Redis, key: string, windowMs: number): Promise<number> {
  if (redis.status === "wait") await redis.connect();

  const redisKey = `ratelimit:${key}`;
  const results = await redis.multi().incr(redisKey).pexpire(redisKey, windowMs, "NX").exec();
  const count = results?.[0]?.[1];
  if (typeof count !== "number") throw new Error("Unexpected Redis INCR result");
  return count;
}

/**
 * Throws AppError(429) once `key` has made more than `limit` requests within
 * `windowMs`. Keys are user IDs for signed-in routes, or `ip:<address>` for
 * public ones.
 */
export async function checkRateLimit(key: string, limit: number, windowMs: number): Promise<void> {
  const redis = getRedis();
  let count: number;

  if (redis) {
    try {
      count = await incrementInRedis(redis, key, windowMs);
    } catch (error) {
      console.warn("[rateLimit] Falling back to in-memory limiter:", (error as Error).message);
      count = incrementInMemory(key, windowMs);
    }
  } else {
    count = incrementInMemory(key, windowMs);
  }

  if (count > limit) {
    throw new AppError("Too many requests — please wait before trying again.", 429);
  }
}

/** Best-effort client IP for rate-limiting public endpoints behind a proxy. */
export function clientIp(headers: Headers): string {
  const forwarded = headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return forwarded || headers.get("x-real-ip") || "unknown";
}
