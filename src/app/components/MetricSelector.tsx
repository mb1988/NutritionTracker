"use client";

import { NUTRITION_METRICS, type DailyGoals, type SelectableMetricKey } from "@/app/types";
import { type ApiDaySummary } from "@/app/hooks/useNutritionData";
import { type TimePeriod, getDateRangeForPeriod } from "@/app/components/TimePeriodSelector";

type Props = {
  allDays: ApiDaySummary[];
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

/** Average of a metric over the logged days among `dates`, or null when none are logged. */
function averageOver(dates: string[], byDate: Map<string, ApiDaySummary>, apiKey: string): number | null {
  const values = dates
    .filter((date) => byDate.has(date))
    .map((date) => Number((byDate.get(date) as Record<string, unknown>)[apiKey] ?? 0));
  return values.length > 0 ? values.reduce((sum, v) => sum + v, 0) / values.length : null;
}

/** Changes smaller than this (as a fraction) read as "steady". */
const STEADY_THRESHOLD = 0.03;

function TrendArrow({ current, previous, reverse }: { current: number; previous: number | null; reverse: boolean }) {
  if (previous === null || previous === 0) return null;
  const change = (current - previous) / previous;
  if (Math.abs(change) < STEADY_THRESHOLD) {
    return <span className="trend-arrow" title="About the same as the previous period">→ steady</span>;
  }
  const up = change > 0;
  // For limits (sugar, salt…) going down is good; for targets (protein, fibre…) going up is.
  const improving = reverse ? up : !up;
  return (
    <span
      className={`trend-arrow ${improving ? "trend-arrow--good" : "trend-arrow--bad"}`}
      title={`${up ? "Up" : "Down"} ${Math.round(Math.abs(change) * 100)}% vs the previous period`}
    >
      {up ? "↑" : "↓"} {Math.round(Math.abs(change) * 100)}%
    </span>
  );
}

export function MetricSelector({ allDays, goals, selectedMetric, timePeriod, onSelect }: Props) {
  const periodDays = getDateRangeForPeriod(timePeriod);
  const previousDays = getDateRangeForPeriod(timePeriod, 1);
  const byDate = new Map(allDays.map((day) => [day.date, day]));

  // Days in the period that actually exist in the DB
  const totalDays = periodDays.length;
  const daysWithData = periodDays.filter((date) => byDate.has(date)).length;
  const showCoverageNotice = daysWithData < totalDays;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-2)" }}>
      {/* Coverage notice — shown below selector, above metric tiles */}
      {showCoverageNotice && (
        <p style={{
          margin: 0,
          fontSize: "0.75rem",
          fontWeight: 600,
          color: "var(--md-on-surface-variant)",
        }}>
          {daysWithData === 0
            ? "No data logged for this period yet"
            : `${daysWithData} of ${totalDays} days have data · averages are over logged days only`}
        </p>
      )}

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(108px, 1fr))",
          gap: "var(--space-2)",
        }}
      >
        {(Object.keys(NUTRITION_METRICS) as SelectableMetricKey[]).map((metricKey) => {
          const metric = NUTRITION_METRICS[metricKey];

          // Average only over days that are actually logged
          const average = averageOver(periodDays, byDate, metric.apiTotalKey);
          const previousAverage = averageOver(previousDays, byDate, metric.apiTotalKey);
          const avg = average ?? 0;

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
                border: isSelected
                  ? "1px solid rgba(104, 185, 132, 0.35)"
                  : "1px solid rgba(255,255,255,0.06)",
                background: isSelected
                  ? "rgba(104, 185, 132, 0.08)"
                  : "var(--md-surface-container-high)",
                display: "flex",
                flexDirection: "column",
                alignItems: "flex-start",
                gap: 4,
                textAlign: "left",
                minHeight: 72,
              }}
              title={`Show trend for ${metric.label}`}
              aria-pressed={isSelected}
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
                  color: average !== null ? color : "var(--md-on-surface-variant)",
                  lineHeight: 1.1,
                  fontVariantNumeric: "tabular-nums",
                }}
              >
                {average !== null ? formatMetricValue(avg, metric.unit) : "—"}
              </span>
              <span
                style={{
                  fontSize: "0.6875rem",
                  color: "var(--md-on-surface-variant)",
                  fontVariantNumeric: "tabular-nums",
                }}
              >
                {formatMetricValue(target, metric.unit)} {metric.reverse ? "target" : "limit"}
              </span>
              {average !== null && (
                <TrendArrow current={average} previous={previousAverage} reverse={metric.reverse} />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
