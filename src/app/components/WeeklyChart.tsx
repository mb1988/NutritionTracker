"use client";

import {
  BarChart, Bar, XAxis, YAxis, Tooltip,
  ResponsiveContainer, Cell, ReferenceLine, CartesianGrid,
} from "recharts";
import { type LocalMeal, type DailyGoals } from "@/app/types";

type Props = {
  allMeals:     LocalMeal[];
  selectedDate: string;
  goals:        DailyGoals;
  onSelectDate: (date: string) => void;
};

function getLast7Days(): string[] {
  const days: string[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    days.push(d.toISOString().slice(0, 10));
  }
  return days;
}

function shortDay(iso: string): string {
  const d = new Date(`${iso}T00:00:00`);
  return d.toLocaleDateString("en-GB", { weekday: "short" });
}

const CustomTooltip = ({ active, payload, label }: {
  active?: boolean;
  payload?: { value: number }[];
  label?: string;
}) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="chart-tooltip">
      <p className="chart-tooltip__label">{label}</p>
      <p className="chart-tooltip__value">{Math.round(payload[0].value)} kcal</p>
    </div>
  );
};

export function WeeklyChart({ allMeals, selectedDate, goals, onSelectDate }: Props) {
  const days = getLast7Days();

  const data = days.map((date) => {
    const meals = allMeals.filter((m) => m.date === date);
    const calories = meals.reduce((sum, m) => sum + m.calories, 0);
    return { date, label: shortDay(date), calories };
  });

  function handleBarClick(barData: unknown) {
    if (barData && typeof barData === "object" && "date" in barData) {
      onSelectDate((barData as { date: string }).date);
    }
  }

  return (
    <div className="card weekly-chart">
      <div className="card-header">
        <h2>Last 7 Days</h2>
        <span className="badge-pill">kcal</span>
      </div>
      <div style={{ padding: "var(--space-4) var(--space-5) var(--space-5)" }}>
        <ResponsiveContainer width="100%" height={160}>
          <BarChart data={data} barCategoryGap="30%">
            <CartesianGrid vertical={false} stroke="var(--color-border)" strokeDasharray="3 3" />
            <XAxis
              dataKey="label"
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 11, fill: "var(--color-text-muted)", fontWeight: 600 }}
            />
            <YAxis hide />
            <Tooltip content={<CustomTooltip />} cursor={{ fill: "var(--color-surface-raised)" }} />
            <ReferenceLine
              y={goals.calories}
              stroke="var(--color-danger)"
              strokeDasharray="4 4"
              strokeWidth={1.5}
            />
            <Bar
              dataKey="calories"
              radius={[4, 4, 0, 0]}
              maxBarSize={40}
              style={{ cursor: "pointer" }}
              onClick={handleBarClick}
            >
              {data.map((entry) => (
                <Cell
                  key={entry.date}
                  fill={
                    entry.date === selectedDate
                      ? "var(--color-accent)"
                      : entry.calories > goals.calories
                      ? "var(--color-danger)"
                      : "var(--color-accent-light)"
                  }
                  stroke={entry.date === selectedDate ? "var(--color-accent-hover)" : "none"}
                  strokeWidth={entry.date === selectedDate ? 1.5 : 0}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
        <p className="chart-legend">
          <span className="chart-legend__dot" style={{ background: "var(--color-danger)" }} />
          <span>Goal line {goals.calories} kcal. Click a bar to navigate.</span>
        </p>
      </div>
    </div>
  );
}
