"use client";

export type TimePeriod = "1week" | "1month" | "3months" | "6months";

type AggregationType = "daily" | "weekly" | "monthly";

type Props = {
  selected: TimePeriod;
  onSelect: (period: TimePeriod) => void;
};

const PERIODS: { value: TimePeriod; label: string }[] = [
  { value: "1week", label: "1 Week" },
  { value: "1month", label: "1 Month" },
  { value: "3months", label: "3 Months" },
  { value: "6months", label: "6 Months" },
];

export function getAggregationType(period: TimePeriod): AggregationType {
  switch (period) {
    case "1week":
      return "daily";
    case "1month":
      return "weekly";
    case "3months":
      return "weekly";
    case "6months":
      return "monthly";
  }
}

export function getDateRangeForPeriod(period: TimePeriod): string[] {
  const days: string[] = [];
  const endDate = new Date();
  const startDate = new Date();

  switch (period) {
    case "1week":
      startDate.setDate(endDate.getDate() - 6);
      break;
    case "1month":
      startDate.setDate(endDate.getDate() - 29);
      break;
    case "3months":
      startDate.setDate(endDate.getDate() - 89);
      break;
    case "6months":
      startDate.setDate(endDate.getDate() - 179);
      break;
  }

  const current = new Date(startDate);
  while (current <= endDate) {
    days.push(current.toISOString().slice(0, 10));
    current.setDate(current.getDate() + 1);
  }

  return days;
}

export function getPeriodLabel(period: TimePeriod): string {
  switch (period) {
    case "1week":
      return "7-Day";
    case "1month":
      return "Monthly";
    case "3months":
      return "Quarterly";
    case "6months":
      return "6-Month";
  }
}

/** Get week number for aggregation (1-4 for month, 1-26 for 6 months) */
function getWeekNumber(date: string, startDate: string): number {
  const d = new Date(`${date}T00:00:00`);
  const s = new Date(`${startDate}T00:00:00`);
  const diffTime = d.getTime() - s.getTime();
  const weekNum = Math.floor(diffTime / (7 * 24 * 60 * 60 * 1000));
  return weekNum;
}

/** Get month number for aggregation (0-5 for 6 months) */
function getMonthNumber(date: string, startDate: string): number {
  const d = new Date(`${date}T00:00:00`);
  const s = new Date(`${startDate}T00:00:00`);
  const monthDiff = (d.getFullYear() - s.getFullYear()) * 12 + (d.getMonth() - s.getMonth());
  return monthDiff;
}

export type AggregatedDay = {
  label: string; // e.g. "Mon", "Week 1", "Jan"
  value: number;
  date: string; // Representative date for this aggregation (for clicking)
  count: number; // Number of days in this aggregation
};

export function aggregateData(
  days: string[],
  byDate: Map<string, { [key: string]: unknown }>,
  metricKey: string,
  period: TimePeriod,
): AggregatedDay[] {
  const aggregation = getAggregationType(period);

  if (aggregation === "daily") {
    // No aggregation for 1 week
    return days.map((date) => ({
      label: new Date(`${date}T00:00:00`).toLocaleDateString("en-GB", { weekday: "short" }),
      value: byDate.get(date) ? Number((byDate.get(date) as Record<string, unknown>)[metricKey] ?? 0) : 0,
      date,
      count: 1,
    }));
  }

  const startDate = days[0];
  const aggregated = new Map<number, { sum: number; count: number; lastDate: string }>();

  for (const date of days) {
    const day = byDate.get(date);
    const value = day ? Number((day as Record<string, unknown>)[metricKey] ?? 0) : 0;

    let key: number;
    if (aggregation === "weekly") {
      key = getWeekNumber(date, startDate);
    } else {
      key = getMonthNumber(date, startDate);
    }

    if (!aggregated.has(key)) {
      aggregated.set(key, { sum: 0, count: 0, lastDate: date });
    }

    const current = aggregated.get(key)!;
    current.sum += value;
    current.count += 1;
    current.lastDate = date;
  }

  const result: AggregatedDay[] = [];
  for (const [key, data] of Array.from(aggregated.entries()).sort((a, b) => a[0] - b[0])) {
    if (aggregation === "weekly") {
      const label = `W${key + 1}`;
      result.push({
        label,
        value: data.count > 0 ? data.sum / data.count : 0,
        date: data.lastDate,
        count: data.count,
      });
    } else {
      // Monthly
      const monthDate = new Date(`${data.lastDate}T00:00:00`);
      const label = monthDate.toLocaleDateString("en-GB", { month: "short" });
      result.push({
        label,
        value: data.count > 0 ? data.sum / data.count : 0,
        date: data.lastDate,
        count: data.count,
      });
    }
  }

  return result;
}

export function TimePeriodSelector({ selected, onSelect }: Props) {
  return (
    <div
      style={{
        display: "flex",
        gap: "var(--space-2)",
        flexWrap: "wrap",
      }}
    >
      {PERIODS.map((period) => (
        <button
          key={period.value}
          type="button"
          onClick={() => onSelect(period.value)}
          style={{
            padding: "8px 16px",
            borderRadius: "var(--radius-full)",
            border: selected === period.value ? "1px solid var(--md-primary)" : "1px solid rgba(255,255,255,0.06)",
            background: selected === period.value ? "rgba(104, 185, 132, 0.12)" : "var(--md-surface-container-high)",
            color: selected === period.value ? "var(--md-primary)" : "var(--md-on-surface)",
            fontWeight: selected === period.value ? 700 : 600,
            fontSize: "0.875rem",
            cursor: "pointer",
            transition: "all var(--transition)",
          }}
        >
          {period.label}
        </button>
      ))}
    </div>
  );
}
