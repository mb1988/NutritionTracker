import { offsetDate } from "@/app/lib/dates";

/**
 * Consecutive days with at least one meal logged, ending today — or ending
 * yesterday when today has nothing logged yet, so the streak doesn't look
 * broken first thing in the morning.
 */
export function computeStreak(days: { date: string; mealCount: number }[], today: string): number {
  const logged = new Set(days.filter((day) => day.mealCount > 0).map((day) => day.date));

  let cursor = logged.has(today) ? today : offsetDate(today, -1);
  let streak = 0;
  while (logged.has(cursor)) {
    streak += 1;
    cursor = offsetDate(cursor, -1);
  }
  return streak;
}
