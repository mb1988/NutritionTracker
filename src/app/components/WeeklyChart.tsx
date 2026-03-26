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
    const meals    = allMeals.filter((m) => m.date === date);
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
        <h2>7-Day Overview</h2>
        <span className="badge-pill">kcal</span>
      </div>
      <div style={{ padding: "var(--space-4) var(--space-5) var(--space-5)" }}>
        <ResponsiveContainer width="100%" height={160}>
          <BarChart data={data} barCategoryGap="30%" margin={{ top: 4, right: 0, bottom: 0, left: 0 }}>
            <CartesianGrid vertical={false} stroke="var(--md-outline-variant)" strokeDasharray="3 3" />
            <XAxis
              dataKey="label"
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 11, fill: "var(--md-on-surface-variant)", fontWeight: 600, fontFamily: "Inter, sans-serif" }}
            />
            <YAxis hide />
            <Tooltip
              content={<CustomTooltip />}
              cursor={{ fill: "var(--md-surface-container-low)", rx: 6 }}
            />
            <ReferenceLine
              y={goals.calories}
              stroke="var(--color-danger)"
              strokeDasharray="4 4"
              strokeWidth={1.5}
            />
            <Bar
              dataKey="calories"
              radius={[6, 6, 0, 0]}
              maxBarSize={44}
              style={{ cursor: "pointer" }}
              onClick={handleBarClick}
            >
              {data.map((entry) => (
                <Cell
                  key={entry.date}
                  fill={
                    entry.date === selectedDate
                      ? "var(--md-primary)"
                      : entry.calories > goals.calories
                      ? "var(--color-danger)"
                      : "var(--md-primary-container)"
                  }
                  stroke={entry.date === selectedDate ? "var(--color-accent-hover)" : "none"}
                  strokeWidth={entry.date === selectedDate ? 1.5 : 0}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
        <p style={{ display: "flex", alignItems: "center", gap: 6, fontSize: "0.75rem", color: "var(--md-on-surface-variant)", marginTop: 8 }}>
          <span style={{ display: "inline-block", width: 20, height: 3, borderRadius: 9999, background: "var(--color-danger)", opacity: 0.8 }} />
          Goal: {goals.calories} kcal · tap a bar to navigate
        </p>
      </div>
    </div>
  );
}
