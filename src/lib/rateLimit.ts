import { AppError } from "@/server/errors";

// NOTE: This is an in-memory store — it resets on server restart and does not
// work correctly if Railway ever scales to multiple instances. In that case,
// replace this with a Redis-backed solution (e.g. Upstash).
const store = new Map<string, { count: number; resetAt: number }>();

export function checkRateLimit(userId: string, limit: number, windowMs: number): void {
  const now = Date.now();
  const entry = store.get(userId);

  if (!entry || now >= entry.resetAt) {
    store.set(userId, { count: 1, resetAt: now + windowMs });
    return;
  }

  if (entry.count >= limit) {
    throw new AppError("Too many requests — please wait before trying again.", 429);
  }

  entry.count += 1;
}
