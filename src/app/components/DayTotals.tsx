"use client";

import { type DaySnapshot, type DailyGoals } from "@/app/types";
import { GoalsPanel } from "@/app/components/GoalsPanel";

type Props = {
  totals:      DaySnapshot;
  goals:       DailyGoals;
  mealCount:   number;
  selectedDate: string;
  onGoalsSave: (g: DailyGoals) => void;
};

function formatDisplayDate(iso: string): string {
  const d = new Date(`${iso}T00:00:00`);
  return d.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

type MacroRowProps = {
  label:   string;
  value:   number;
  goal:    number;
  unit:    string;
  reverse?: boolean;
};

function MacroRow({ label, value, goal, unit, reverse = false }: MacroRowProps) {
  const ratio        = goal > 0 ? value / goal : 0;
  const isOver       = !reverse && ratio > 1;
  const isApproach   = !reverse && ratio > 0.85 && ratio <= 1;
  const isLow        = reverse && ratio < 0.5;
  const isClose      = reverse && ratio >= 0.5 && ratio < 0.8;
  const isMet        = reverse && ratio >= 1;

  const barColor =
    isOver || isLow ? "var(--status-over)" :
    isApproach || isClose ? "var(--status-warn)" :
    "var(--status-good)";

  const valueColor =
    isOver || isLow ? "var(--status-over)" :
    isApproach || isClose ? "var(--status-warn)" :
    isMet ? "var(--md-primary)" : "var(--md-on-surface)";

  const pct          = goal > 0 ? Math.min(ratio * 100, 100) : 0;
  const displayValue = unit === "mg" ? Math.round(value) : Math.round(value * 10) / 10;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
        <span style={{
          fontSize: "0.6875rem", fontWeight: 800, textTransform: "uppercase",
          letterSpacing: "0.07em", color: "var(--md-on-surface-variant)",
        }}>{label}</span>
        <span style={{ fontSize: "0.8125rem", fontVariantNumeric: "tabular-nums" }}>
          <span style={{ fontWeight: 800, color: valueColor }}>{displayValue}</span>
          <span style={{ color: "var(--md-on-surface-variant)", fontWeight: 500 }}> / {goal}{unit}</span>
        </span>
      </div>
      <div style={{ height: 8, background: "rgba(255,255,255,0.1)", borderRadius: 99, overflow: "hidden" }}>
        <div style={{
          height: "100%", width: `${pct}%`,
          background: barColor,
          borderRadius: 99,
          transition: "width 0.5s cubic-bezier(0.2,0,0,1)",
        }} />
      </div>
    </div>
  );
}

const MACRO_ROWS: Array<{
  key:     keyof DaySnapshot;
  goalKey: keyof DailyGoals;
  label:   string;
  unit:    string;
  reverse?: boolean;
}> = [
  { key: "calories",     goalKey: "calories",     label: "Calories",      unit: "kcal" },
  { key: "protein",      goalKey: "protein",      label: "Protein",       unit: "g",  reverse: true },
  { key: "carbs",        goalKey: "carbs",        label: "Carbs",         unit: "g" },
  { key: "fat",          goalKey: "fat",          label: "Total Fat",     unit: "g" },
  { key: "satFat",       goalKey: "satFat",       label: "Sat Fat",       unit: "g" },
  { key: "addedSugar",   goalKey: "addedSugar",   label: "Added Sugar",   unit: "g" },
  { key: "naturalSugar", goalKey: "naturalSugar", label: "Natural Sugar", unit: "g" },
  { key: "fibre",        goalKey: "fibre",        label: "Fibre",         unit: "g",  reverse: true },
  { key: "salt",         goalKey: "salt",         label: "Salt",          unit: "g" },
  { key: "alcohol",      goalKey: "alcohol",      label: "Alcohol",       unit: "u" },
  { key: "omega3",       goalKey: "omega3",       label: "Omega-3",       unit: "mg", reverse: true },
];

export function DayTotals({ totals, goals, mealCount, selectedDate, onGoalsSave }: Props) {
  const remaining = Math.max(0, goals.calories - totals.calories);
  const isOver    = totals.calories > goals.calories;
  const todayIso  = new Date().toISOString().slice(0, 10);
  const isToday   = selectedDate === todayIso;
  const title     = isToday ? "Today’s Progress" : `Progress for ${formatDisplayDate(selectedDate)}`;

  return (
    <div className="card" style={{ padding: "var(--space-6)" }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "var(--space-6)" }}>
        <div>
          <h2 style={{ fontSize: "0.9375rem", fontWeight: 800, letterSpacing: "-0.025em" }}>{title}</h2>
          <span style={{ fontSize: "0.8125rem", color: "var(--md-on-surface-variant)", marginTop: 4, display: "block" }}>
            {mealCount} meal{mealCount !== 1 ? "s" : ""}&nbsp;·&nbsp;
            {isOver
              ? <span style={{ color: "var(--md-error)", fontWeight: 700 }}>over by {Math.abs(Math.round(totals.calories - goals.calories))} kcal</span>
              : <span style={{ color: "var(--md-primary-container)", fontWeight: 600 }}>{remaining} kcal remaining</span>
            }
          </span>
        </div>
        <GoalsPanel goals={goals} onSave={onGoalsSave} />
      </div>

      {/* All macro bars */}
      <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
        {MACRO_ROWS.map(({ key, goalKey, label, unit, reverse }) => (
          <MacroRow
            key={key}
            label={label}
            value={(totals[key] as number) ?? 0}
            goal={goals[goalKey]}
            unit={unit}
            reverse={reverse}
          />
        ))}
        {/* Steps (no goal, just display if present) */}
        {(totals.steps ?? 0) > 0 && (
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingTop: "var(--space-1)" }}>
            <span style={{ fontSize: "0.6875rem", fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.07em", color: "var(--md-on-surface-variant)" }}>
              Steps
            </span>
            <span style={{ fontSize: "0.8125rem", fontWeight: 800, color: "var(--md-primary)", fontVariantNumeric: "tabular-nums" }}>
              {(totals.steps ?? 0).toLocaleString()}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
