"use client";

import { NUTRITION_METRICS, type DailyGoals, type SelectableMetricKey } from "@/app/types";
import { type ApiDay } from "@/app/hooks/useNutritionData";
import { type TimePeriod } from "@/app/components/TimePeriodSelector";

type Props = {
  allDays: ApiDay[];
  goals: DailyGoals;
  selectedMetric: SelectableMetricKey;
  timePeriod: TimePeriod;
  onSelect: (metric: SelectableMetricKey) => void;
};

function getStatusColor(value: number, target: number, reverse: boolean) {
  const ratio = target > 0 ? value / target : 0;
  if (reverse) {
    if (ratio >= 1) return "var(--status-good)";
    if (ratio >= 0.8) return "var(--status-warn)";
    return "var(--status-over)";
  }
  if (ratio <= 0.75) return "var(--status-good)";
  if (ratio <= 1) return "var(--status-warn)";
  return "var(--status-over)";
}

function formatMetricValue(value: number, unit: string) {
  if (unit === "kcal" || unit === "mg") return `${Math.round(value)}${unit}`;
  return `${Math.round(value * 10) / 10}${unit}`;
}

export function MetricSelector({ allDays, goals, selectedMetric, onSelect }: Props) {
  const last7 = getLast7Days();
  const byDate = new Map(allDays.map((day) => [day.date, day]));

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(108px, 1fr))",
        gap: "var(--space-2)",
      }}
    >
      {(Object.keys(NUTRITION_METRICS) as SelectableMetricKey[]).map((metricKey) => {
        const metric = NUTRITION_METRICS[metricKey];
        const values = last7.map((date) => {
          const day = byDate.get(date);
          return day ? Number((day as Record<string, unknown>)[metric.apiTotalKey] ?? 0) : 0;
        });
        const avg = values.reduce((sum, value) => sum + value, 0) / last7.length;
        const target = goals[metricKey];
        const color = getStatusColor(avg, target, metric.reverse);
        const isSelected = selectedMetric === metricKey;

        return (
          <button
            key={metricKey}
            type="button"
            onClick={() => onSelect(metricKey)}
            style={{
              padding: "10px 12px",
              borderRadius: "var(--radius-md)",
              border: isSelected ? "1px solid rgba(104, 185, 132, 0.35)" : "1px solid rgba(255,255,255,0.06)",
              background: isSelected ? "rgba(104, 185, 132, 0.08)" : "var(--md-surface-container-high)",
              display: "flex",
              flexDirection: "column",
              alignItems: "flex-start",
              gap: 4,
              textAlign: "left",
              minHeight: 72,
            }}
            title={`Show 7-day trend for ${metric.label}`}
          >
            <span
              style={{
                fontSize: "0.625rem",
                fontWeight: 800,
                textTransform: "uppercase",
                letterSpacing: "0.06em",
                color: isSelected ? "var(--md-primary)" : "var(--md-on-surface-variant)",
              }}
            >
              {metric.shortLabel}
            </span>
            <span
              style={{
                fontSize: "0.95rem",
                fontWeight: 800,
                color,
                lineHeight: 1.1,
                fontVariantNumeric: "tabular-nums",
              }}
            >
              {formatMetricValue(avg, metric.unit)}
            </span>
            <span
              style={{
                fontSize: "0.6875rem",
                color: "var(--md-on-surface-variant)",
                fontVariantNumeric: "tabular-nums",
              }}
            >
              {daysWithData < aggregated.length ? `only ${daysWithData}/${aggregated.length} periods` : `${formatMetricValue(target, metric.unit)} tgt`}
            </span>
          </button>
        );
      })}
    </div>
  );
}

