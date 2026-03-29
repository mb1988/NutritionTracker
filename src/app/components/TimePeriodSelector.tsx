"use client";

export type TimePeriod = "1week" | "1month" | "3months" | "6months";

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
