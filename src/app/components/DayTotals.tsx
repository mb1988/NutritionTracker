"use client";

import { type DaySnapshot, type DailyGoals } from "@/app/types";
import { MacroProgressRow } from "@/app/components/MacroProgressRow";
import { GoalsPanel }       from "@/app/components/GoalsPanel";

type Props = {
  totals:     DaySnapshot;
  goals:      DailyGoals;
  mealCount:  number;
  onGoalsSave: (g: DailyGoals) => void;
};

export function DayTotals({ totals, goals, mealCount, onGoalsSave }: Props) {
  const remaining   = Math.max(0, goals.calories - totals.calories);
  const isOver      = totals.calories > goals.calories;
  const caloriePct  = Math.min(totals.calories / goals.calories, 1.5);
  const ringColor   = isOver ? "var(--color-danger)" : totals.calories > goals.calories * 0.85 ? "var(--color-warning)" : "var(--color-accent)";

  return (
    <div className="card" style={{ padding: "var(--space-5) var(--space-6)" }}>
      {/* ── Header ── */}
      <div className="row" style={{ justifyContent: "space-between", alignItems: "flex-start", marginBottom: "var(--space-5)" }}>
        <div>
          <h2 style={{ fontSize: "1rem", fontWeight: 700, letterSpacing: "-0.02em" }}>Today&rsquo;s Progress</h2>
          <span style={{ fontSize: "0.8125rem", color: "var(--md-on-surface-variant)", marginTop: 2, display: "block" }}>
            {mealCount} meal{mealCount !== 1 ? "s" : ""}&nbsp;·&nbsp;
            {isOver
              ? <span style={{ color: "var(--color-danger)", fontWeight: 600 }}>over goal by {Math.abs(Math.round(totals.calories - goals.calories))} kcal</span>
              : <span>{remaining} kcal remaining</span>
            }
          </span>
        </div>
        <GoalsPanel goals={goals} onSave={onGoalsSave} />
      </div>

      {/* ── Calorie ring + hero ── */}
      <div style={{ display: "flex", alignItems: "center", gap: "var(--space-5)", marginBottom: "var(--space-5)" }}>
        {/* Mini ring */}
        <div style={{ position: "relative", width: 72, height: 72, flexShrink: 0 }}>
          <svg width="72" height="72" style={{ transform: "rotate(-90deg)" }}>
            <circle cx="36" cy="36" r="28" fill="none" stroke="var(--md-surface-container-high)" strokeWidth="7" />
            <circle
              cx="36" cy="36" r="28" fill="none"
              stroke={ringColor}
              strokeWidth="7"
              strokeLinecap="round"
              strokeDasharray={`${2 * Math.PI * 28}`}
              strokeDashoffset={`${2 * Math.PI * 28 * (1 - Math.min(caloriePct, 1))}`}
              style={{ transition: "stroke-dashoffset 0.5s cubic-bezier(0.2,0,0,1), stroke 0.3s ease" }}
            />
          </svg>
          <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: ringColor, fontVariantNumeric: "tabular-nums" }}>
              {Math.round((caloriePct * 100))}%
            </span>
          </div>
        </div>

        {/* Hero number */}
        <div>
          <div className="calories-hero" style={{ marginBottom: 0 }}>
            <span className="calories-hero__value" style={{ color: ringColor }}>
              {Math.round(totals.calories)}
            </span>
            <span className="calories-hero__unit">/ {goals.calories} kcal</span>
          </div>
          <div style={{ fontSize: "0.8125rem", color: "var(--md-on-surface-variant)", marginTop: 2 }}>
            {isOver ? "🔴 Over your daily goal" : remaining === 0 ? "🟢 Goal reached!" : "🟡 Keep it up"}
          </div>
        </div>
      </div>

      {/* ── Primary macro bars ── */}
      <div className="stack" style={{ gap: "var(--space-4)", marginBottom: "var(--space-5)" }}>
        <MacroProgressRow label="Protein"  value={totals.protein}  goal={goals.protein}  color="var(--macro-protein)" />
        <MacroProgressRow label="Carbs"    value={totals.carbs}    goal={goals.carbs}    color="var(--macro-carbs)" />
        <MacroProgressRow label="Fat"      value={totals.fat}      goal={goals.fat}      color="var(--macro-fat)" />
      </div>

      {/* ── Secondary tracking ── */}
      <div style={{ borderTop: "1px solid var(--md-outline-variant)", paddingTop: "var(--space-4)" }}>
        <div className="macro-tiles-section-label" style={{ marginBottom: "var(--space-3)" }}>Also tracking</div>
        <div className="stack" style={{ gap: "var(--space-3)", marginBottom: "var(--space-4)" }}>
          <MacroProgressRow label="Fibre" value={totals.fibre} goal={goals.fibre} color="var(--macro-fiber)" />
          <MacroProgressRow label="Salt"  value={totals.salt}  goal={goals.salt}  color="var(--macro-warning)" />
        </div>

        {/* Micro tiles */}
        <div className="macro-tiles-secondary">
          {[
            { label: "Sat Fat",     value: totals.satFat,       color: "var(--macro-fat)",      unit: "g" },
            { label: "Added Sugar", value: totals.addedSugar,   color: "var(--macro-carbs)",     unit: "g" },
            { label: "Nat. Sugar",  value: totals.naturalSugar, color: "var(--macro-carbs)",     unit: "g" },
            { label: "Omega-3",     value: totals.omega3 ?? 0,  color: "var(--macro-fiber)",     unit: "mg" },
            { label: "Alcohol",     value: totals.alcohol ?? 0, color: "var(--macro-warning)",   unit: "u" },
            ...(totals.steps && totals.steps > 0
              ? [{ label: "Steps", value: totals.steps, color: "var(--color-accent)", unit: "" }]
              : []
            ),
          ].map(({ label, value, color, unit }) => (
            <div key={label} className="macro-tile">
              <span className="macro-tile__value" style={{ color }}>
                {unit === "mg"
                  ? Math.round(value)
                  : label === "Steps"
                    ? value.toLocaleString()
                    : Math.round(value * 10) / 10
                }
              </span>
              <span className="macro-tile__label">{label}</span>
              {unit && <span className="macro-tile__unit">{unit}</span>}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
