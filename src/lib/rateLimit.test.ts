import { afterEach, describe, expect, it, vi } from "vitest";
import { checkRateLimit, clientIp, incrementInMemory } from "@/lib/rateLimit";

describe("rateLimit", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("counts requests within a window and resets afterwards", () => {
    expect(incrementInMemory("count-key", 1000, 0)).toBe(1);
    expect(incrementInMemory("count-key", 1000, 500)).toBe(2);
    expect(incrementInMemory("count-key", 1000, 1000)).toBe(1);
  });

  it("allows up to the limit then throws 429", async () => {
    await checkRateLimit("limit-key", 2, 60_000);
    await checkRateLimit("limit-key", 2, 60_000);
    await expect(checkRateLimit("limit-key", 2, 60_000)).rejects.toMatchObject({ status: 429 });
  });

  it("keeps separate counters per key", async () => {
    await checkRateLimit("user-a", 1, 60_000);
    await expect(checkRateLimit("user-b", 1, 60_000)).resolves.toBeUndefined();
  });

  it("reads the first forwarded client IP", () => {
    expect(clientIp(new Headers({ "x-forwarded-for": "203.0.113.5, 10.0.0.1" }))).toBe("203.0.113.5");
    expect(clientIp(new Headers({ "x-real-ip": "198.51.100.2" }))).toBe("198.51.100.2");
    expect(clientIp(new Headers())).toBe("unknown");
  });
});
