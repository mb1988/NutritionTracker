import { describe, expect, it } from "vitest";

import { subtractDays, weeklyWeightChange } from "@/lib/weightTrend";

describe("weightTrend", () => {
  it("subtracts days across month and year boundaries", () => {
    expect(subtractDays("2026-03-01", 1)).toBe("2026-02-28");
    expect(subtractDays("2026-01-05", 10)).toBe("2025-12-26");
  });

  it("compares the newest entry with the oldest one in the last week", () => {
    const entries = [
      { date: "2026-10-02", weightKg: 80.2 },
      { date: "2026-09-29", weightKg: 80.6 },
      { date: "2026-09-26", weightKg: 80.9 },
      { date: "2026-09-20", weightKg: 82 },
    ];
    expect(weeklyWeightChange(entries)).toBe(-0.7);
  });

  it("returns null without an earlier entry in the window", () => {
    expect(weeklyWeightChange([{ date: "2026-10-02", weightKg: 80 }])).toBeNull();
    expect(weeklyWeightChange([
      { date: "2026-10-02", weightKg: 80 },
      { date: "2026-09-01", weightKg: 82 },
    ])).toBeNull();
  });
});
