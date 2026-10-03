import { describe, expect, it } from "vitest";
import { computeStreak } from "@/app/lib/streak";

const day = (date: string, mealCount = 2) => ({ date, mealCount });

describe("computeStreak", () => {
  it("counts consecutive logged days ending today", () => {
    const days = [day("2026-10-02"), day("2026-10-01"), day("2026-09-30"), day("2026-09-28")];
    expect(computeStreak(days, "2026-10-02")).toBe(3);
  });

  it("keeps yesterday's streak alive before anything is logged today", () => {
    const days = [day("2026-10-01"), day("2026-09-30")];
    expect(computeStreak(days, "2026-10-02")).toBe(2);
  });

  it("is zero when neither today nor yesterday is logged", () => {
    expect(computeStreak([day("2026-09-29")], "2026-10-02")).toBe(0);
  });

  it("ignores days that only have steps or water", () => {
    const days = [day("2026-10-02"), day("2026-10-01", 0), day("2026-09-30")];
    expect(computeStreak(days, "2026-10-02")).toBe(1);
  });

  it("ignores future days and crosses month boundaries", () => {
    const days = [day("2026-10-03"), day("2026-10-01"), day("2026-09-30")];
    expect(computeStreak(days, "2026-10-01")).toBe(2);
  });
});
