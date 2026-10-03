"use client";

import { useEffect, useState } from "react";
import { type DaySnapshot, type DailyGoals, type MealFormValues, type NutrientGoalKey } from "@/app/types";
import { GoalsPanel } from "@/app/components/GoalsPanel";
import { DailyFoodSuggestions } from "@/app/components/DailyFoodSuggestions";
import { StepsInput } from "@/app/components/StepsInput";
import { WaterTracker } from "@/app/components/WaterTracker";
import { formatLongDate, localISODate } from "@/app/lib/dates";

type Props = {
  totals:      DaySnapshot;
  goals:       DailyGoals;
  goalsHydrated?: boolean;
  mealCount:   number;
  selectedDate: string;
  onGoalsSave: (g: DailyGoals) => Promise<void> | void;
  meals?: MealFormValues[];
  savedMeals?: MealFormValues[];
  waterMl: number;
  stepSource?: string | null;
  stepsSyncedAt?: string | null;
  onStepsSave: (steps: number) => Promise<void>;
  onWaterChange: (waterMl: number) => Promise<void>;
};

const SHOW_ALL_KEY = "nutrition_tracker_show_all_nutrients";

type RowStatus = "good" | "warn" | "over" | "met";

/** Limits (reverse=false) turn amber near the goal and red past it; targets (reverse=true) go green once met. */
function rowStatus(value: number, goal: number, reverse: boolean): RowStatus {
  const ratio = goal > 0 ? value / goal : 0;
  if (reverse) {
    if (ratio >= 1) return "met";
    if (ratio < 0.5) return "over";
    return ratio < 0.8 ? "warn" : "good";
  }
  if (ratio > 1) return "over";
  return ratio > 0.85 ? "warn" : "good";
}

const STATUS_COLOR: Record<RowStatus, string> = {
  good: "var(--status-good)",
  met:  "var(--status-good)",
  warn: "var(--status-warn)",
  over: "var(--status-over)",
};

function formatAmount(value: number, unit: string) {
  return unit === "mg" || unit === "kcal" ? Math.round(value) : Math.round(value * 10) / 10;
}

type MacroRowProps = {
  label:   string;
  value:   number;
  goal:    number;
  unit:    string;
  reverse?: boolean;
  helperText?: string;
};

function MacroRow({ label, value, goal, unit, reverse = false, helperText }: MacroRowProps) {
  const status = rowStatus(value, goal, reverse);
  const pct    = goal > 0 ? Math.min((value / goal) * 100, 100) : 0;
  const valueColor = status === "good" ? "var(--md-on-surface)" : status === "met" ? "var(--md-primary)" : STATUS_COLOR[status];

  return (
    <div className="macro-row">
      <div className="macro-row__header">
        <span className="macro-row__label">{label}</span>
        <span className="macro-row__values">
          <strong style={{ color: valueColor }}>{formatAmount(value, unit)}</strong>
          <span> / {goal}{unit}</span>
        </span>
      </div>
      <div
        className="macro-row__track"
        role="progressbar"
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={goal}
        aria-valuenow={formatAmount(value, unit)}
      >
        <div className="macro-row__fill" style={{ width: `${pct}%`, background: STATUS_COLOR[status] }} />
      </div>
      {helperText && <span className="macro-row__helper">{helperText}</span>}
    </div>
  );
}

const MACRO_ROWS: Array<{
  key:     keyof DaySnapshot;
  goalKey: NutrientGoalKey;
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

const HERO_MACROS = MACRO_ROWS.filter((row) => row.key === "protein" || row.key === "carbs" || row.key === "fat");

function CalorieRing({ eaten, goal }: { eaten: number; goal: number }) {
  const radius = 52;
  const circumference = 2 * Math.PI * radius;
  const ratio = goal > 0 ? eaten / goal : 0;
  const isOver = ratio > 1;
  const remaining = Math.round(goal - eaten);
  const color = isOver ? "var(--status-over)" : ratio > 0.85 ? "var(--status-warn)" : "var(--md-primary-container)";

  return (
    <div className="calorie-ring" role="img" aria-label={`${Math.round(eaten)} of ${goal} kcal eaten`}>
      <svg viewBox="0 0 120 120" width="100%" height="100%">
        <circle cx="60" cy="60" r={radius} fill="none" stroke="var(--track)" strokeWidth="10" />
        <circle
          cx="60" cy="60" r={radius} fill="none"
          stroke={color} strokeWidth="10" strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - Math.min(ratio, 1))}
          transform="rotate(-90 60 60)"
          style={{ transition: "stroke-dashoffset 0.6s cubic-bezier(0.2,0,0,1), stroke 0.3s" }}
        />
      </svg>
      <div className="calorie-ring__center">
        <span className="calorie-ring__value" style={{ color: isOver ? "var(--status-over)" : undefined }}>
          {Math.abs(remaining).toLocaleString()}
        </span>
        <span className="calorie-ring__caption">{isOver ? "kcal over" : "kcal left"}</span>
      </div>
    </div>
  );
}

export function DayTotals({
  totals, goals, goalsHydrated = true, mealCount, selectedDate, onGoalsSave, meals = [], savedMeals = [],
  waterMl, stepSource, stepsSyncedAt, onStepsSave, onWaterChange,
}: Props) {
  const [showAll, setShowAll] = useState(false);

  useEffect(() => {
    try {
      setShowAll(localStorage.getItem(SHOW_ALL_KEY) === "1");
    } catch {
      // Storage unavailable — keep the default.
    }
  }, []);

  function toggleShowAll() {
    setShowAll((current) => {
      try {
        localStorage.setItem(SHOW_ALL_KEY, current ? "0" : "1");
      } catch {
        // Storage unavailable — the toggle still works for this visit.
      }
      return !current;
    });
  }

  const steps = totals.steps ?? 0;
  const earnedCalories = goals.stepCalorieAdjustment && steps > 0
    ? Math.round(steps * 0.04)
    : 0;
  const calorieGoal = goals.calories + earnedCalories;
  const effectiveGoals = earnedCalories > 0
    ? { ...goals, calories: calorieGoal }
    : goals;
  const isToday   = selectedDate === localISODate();
  const title     = isToday ? "Today’s progress" : formatLongDate(selectedDate);

  const rows = MACRO_ROWS.map((row) => {
    const goal = row.goalKey === "calories" ? calorieGoal : goals[row.goalKey];
    const value = (totals[row.key] as number) ?? 0;
    return { ...row, goal, value, status: rowStatus(value, goal, row.reverse ?? false) };
  });
  const overLimits = rows.filter((row) => !row.reverse && row.status === "over" && row.key !== "calories");

  return (
    <div className="card day-totals">
      {/* Header */}
      <div className="day-totals__header">
        <div>
          <h2 className="day-totals__title">{title}</h2>
          <span className="day-totals__subtitle">
            {mealCount} meal{mealCount !== 1 ? "s" : ""} · {Math.round(totals.calories).toLocaleString()} / {calorieGoal.toLocaleString()} kcal
          </span>
        </div>
        <GoalsPanel goals={goals} hydrated={goalsHydrated} onSave={onGoalsSave} />
      </div>

      {/* Hero: calories ring + the three macros */}
      <div className="day-totals__hero">
        <CalorieRing eaten={totals.calories} goal={calorieGoal} />
        <div className="day-totals__hero-macros">
          {HERO_MACROS.map((row) => (
            <MacroRow
              key={row.key}
              label={row.label}
              value={(totals[row.key] as number) ?? 0}
              goal={goals[row.goalKey]}
              unit={row.unit}
              reverse={row.reverse}
            />
          ))}
          {earnedCalories > 0 && (
            <span className="macro-row__helper">+{earnedCalories} kcal earned from {steps.toLocaleString()} steps</span>
          )}
        </div>
      </div>

      {/* Activity */}
      <div className="day-totals__activity">
        <StepsInput steps={steps} stepSource={stepSource} stepsSyncedAt={stepsSyncedAt} onSave={onStepsSave} />
        <WaterTracker waterMl={waterMl} goalMl={goals.waterGoal} onChange={onWaterChange} />
      </div>

      {isToday && (
        <DailyFoodSuggestions
          selectedDate={selectedDate}
          goals={effectiveGoals}
          totals={totals}
          meals={meals}
          savedMeals={savedMeals}
        />
      )}

      {/* Every nutrient */}
      <button
        type="button"
        className="day-totals__toggle"
        onClick={toggleShowAll}
        aria-expanded={showAll}
      >
        <span>
          {showAll ? "Hide nutrient details" : "All nutrients"}
          {!showAll && overLimits.length > 0 && (
            <span className="day-totals__flags">
              {overLimits.map((row) => (
                <span key={row.key} className="day-totals__flag">{row.label} over</span>
              ))}
            </span>
          )}
        </span>
        <span className={showAll ? "chevron chevron--open" : "chevron"} aria-hidden="true">▾</span>
      </button>

      {showAll && (
        <div className="day-totals__rows">
          {rows.map((row) => (
            <MacroRow
              key={row.key}
              label={row.label}
              value={row.value}
              goal={row.goal}
              unit={row.unit}
              reverse={row.reverse}
              helperText={
                row.goalKey === "calories" && earnedCalories > 0
                  ? `+${earnedCalories} kcal from ${steps.toLocaleString()} steps`
                  : undefined
              }
            />
          ))}
        </div>
      )}
    </div>
  );
}
