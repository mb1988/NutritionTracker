"use client";

import {
  BarChart, Bar, XAxis, YAxis, Tooltip,
  ResponsiveContainer, Cell, ReferenceLine, CartesianGrid,
} from "recharts";
import { NUTRITION_METRICS, type DailyGoals, type SelectableMetricKey } from "@/app/types";
import { type ApiDaySummary } from "@/app/hooks/useNutritionData";
import { type TimePeriod, getDateRangeForPeriod, aggregateData } from "@/app/components/TimePeriodSelector";

type Props = {
  allDays: ApiDaySummary[];
  selectedDate: string;
  goals: DailyGoals;
  metric: SelectableMetricKey;
  timePeriod: TimePeriod;
  onSelectDate: (date: string) => void;
};

const CustomTooltip = ({ active, payload, label, metric }: {
  active?: boolean;
  payload?: { value: number; payload: { count: number; date: string } }[];
  label?: string;
  metric?: SelectableMetricKey;
}) => {
  if (!active || !payload?.length) return null;
  const unit = metric ? NUTRITION_METRICS[metric].unit : "";
  const { value, payload: entry } = payload[0];
  const dateLabel = new Date(`${entry.date}T12:00:00`).toLocaleDateString("en-GB", { day: "numeric", month: "short" });
  return (
    <div className="chart-tooltip">
      <p className="chart-tooltip__label">{label} · {dateLabel}</p>
      <p className="chart-tooltip__value">
        {entry.count === 0
          ? "Not logged"
          : <>{unit === "kcal" || unit === "mg" ? Math.round(value) : Math.round(value * 10) / 10}{unit}</>}
      </p>
    </div>
  );
};

function getMetricStatusColor(value: number, goal: number, reverse: boolean, isSelected: boolean) {
  const ratio = goal > 0 ? value / goal : 0;
  const good = reverse ? ratio >= 1 : ratio <= 0.75;
  const warn = reverse ? ratio >= 0.8 : ratio <= 1;

  if (good) return isSelected ? "#68b984" : "#496b57";
  if (warn) return isSelected ? "#d4a64c" : "#7d6a3d";
  return isSelected ? "#de7c74" : "#7c5854";
}

const PERIOD_TITLES: Record<TimePeriod, string> = {
  "1week": "1 week",
  "1month": "1 month",
  "3months": "3 months",
  "6months": "6 months",
};

export function WeeklyChart({ allDays, selectedDate, goals, metric, timePeriod, onSelectDate }: Props) {
  const days = getDateRangeForPeriod(timePeriod);
  const metricConfig = NUTRITION_METRICS[metric];
  const goal = goals[metric];
  const byDate = new Map(allDays.map((day) => [day.date, {
    [metricConfig.apiTotalKey]: day[metricConfig.apiTotalKey as keyof ApiDaySummary],
  }]));

  const aggregatedData = aggregateData(days, byDate, metricConfig.apiTotalKey, timePeriod);

  function handleBarClick(barData: unknown) {
    if (barData && typeof barData === "object" && "date" in barData) {
      onSelectDate((barData as { date: string }).date);
    }
  }

  return (
    <div className="card weekly-chart">
      <div className="card-header">
        <h2 style={{ fontWeight: 800 }}>{PERIOD_TITLES[timePeriod]} overview</h2>
        <span className="badge-pill">{metricConfig.shortLabel}</span>
      </div>
      <div style={{ padding: "0 var(--space-5) var(--space-6)" }}>
        <ResponsiveContainer width="100%" height={160}>
          <BarChart data={aggregatedData} barCategoryGap="30%" margin={{ top: 4, right: 0, bottom: 0, left: 0 }}>
            <CartesianGrid vertical={false} stroke="rgba(71,72,70,0.4)" strokeDasharray="4 4" />
            <XAxis
              dataKey="label"
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 11, fill: "#ababa8", fontWeight: 700, fontFamily: "Manrope, sans-serif", letterSpacing: "0.04em" }}
            />
            <YAxis hide />
            <Tooltip
              content={<CustomTooltip metric={metric} />}
              cursor={{ fill: "rgba(42,45,42,0.6)", rx: 8 }}
            />
            {/* Goal reference line */}
            <ReferenceLine
              y={goal}
              stroke="#de7c74"
              strokeDasharray="5 4"
              strokeWidth={1.5}
              strokeOpacity={0.7}
              ifOverflow="extendDomain"
            />
            <Bar
              dataKey="value"
              radius={[8, 8, 4, 4]}
              maxBarSize={44}
              style={{ cursor: "pointer" }}
              onClick={handleBarClick}
            >
              {aggregatedData.map((entry) => (
                <Cell
                  key={entry.date}
                  fill={getMetricStatusColor(entry.value, goal, metricConfig.reverse, entry.date === selectedDate)}
                  opacity={entry.date === selectedDate ? 1 : entry.value === 0 ? 0.25 : 0.85}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
        <p style={{ display: "flex", alignItems: "center", gap: 6, fontSize: "0.6875rem", color: "var(--md-on-surface-variant)", marginTop: 10, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em" }}>
          <span style={{ display: "inline-block", width: 24, height: 3, borderRadius: 9999, background: "#de7c74", opacity: 0.7 }} />
          Goal: {goal}{metricConfig.unit} · {timePeriod === "1week" ? "tap a bar to open that day" : "bars average logged days"}
        </p>
      </div>
    </div>
  );
}
