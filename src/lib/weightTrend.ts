export type WeightEntryDto = {
  date: string;
  weightKg: number;
};

/** Returns the YYYY-MM-DD date `days` before `fromDate`. */
export function subtractDays(fromDate: string, days: number): string {
  const [year, month, day] = fromDate.split("-").map(Number);
  const d = new Date(Date.UTC(year, month - 1, day - days));
  return d.toISOString().slice(0, 10);
}

/**
 * Weight change across the given entries' most recent week: the newest entry
 * minus the oldest entry within 7 days of it. Null when there is no earlier
 * entry in that window to compare against.
 */
export function weeklyWeightChange(entries: WeightEntryDto[]): number | null {
  if (entries.length < 2) return null;

  const sorted = [...entries].sort((a, b) => b.date.localeCompare(a.date));
  const latest = sorted[0];
  const windowStart = subtractDays(latest.date, 7);
  const inWindow = sorted.filter((entry) => entry.date >= windowStart);
  const earliest = inWindow[inWindow.length - 1];

  if (earliest.date === latest.date) return null;
  return Math.round((latest.weightKg - earliest.weightKg) * 10) / 10;
}
