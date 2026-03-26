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
  const remaining = Math.max(0, goals.calories - totals.calories);

  return (
    <div className="card" style={{ padding: "var(--space-5) var(--space-6)", marginBottom: "var(--space-5)" }}>
      {/* Header */}
      <div className="row" style={{ justifyContent: "space-between", alignItems: "center", marginBottom: "var(--space-5)" }}>
        <div>
          <h2 style={{ fontSize: "1rem", fontWeight: 700 }}>Today&rsquo;s Progress</h2>
          <span style={{ fontSize: "0.8125rem", color: "var(--color-text-muted)" }}>
            {mealCount} meal{mealCount !== 1 ? "s" : ""}&nbsp;·&nbsp;
            {remaining > 0
              ? <>{remaining} kcal remaining</>
              : <span style={{ color: "var(--color-danger)" }}>over goal</span>
            }
          </span>
        </div>
        <GoalsPanel goals={goals} onSave={onGoalsSave} />
      </div>

      {/* Calorie hero */}
      <div className="calories-hero">
        <span className="calories-hero__value" style={{ color: totals.calories > goals.calories ? "var(--color-danger)" : "var(--macro-calories)" }}>
          {Math.round(totals.calories)}
        </span>
        <span className="calories-hero__unit">/ {goals.calories} kcal</span>
      </div>

      {/* Primary macro progress bars */}
      <div className="stack" style={{ gap: "var(--space-4)", marginBottom: "var(--space-5)" }}>
        <MacroProgressRow label="Protein"  value={totals.protein}  goal={goals.protein}  color="var(--macro-protein)" />
        <MacroProgressRow label="Carbs"    value={totals.carbs}    goal={goals.carbs}    color="var(--macro-carbs)" />
        <MacroProgressRow label="Fat"      value={totals.fat}      goal={goals.fat}      color="var(--macro-fat)" />
      </div>

      {/* Secondary row */}
      <div className="macro-tiles-section-label" style={{ marginBottom: "var(--space-3)" }}>Also tracking</div>
      <div className="stack" style={{ gap: "var(--space-3)" }}>
        <MacroProgressRow label="Fibre"    value={totals.fibre}       goal={goals.fibre} color="var(--macro-fiber)" />
        <MacroProgressRow label="Salt"     value={totals.salt}        goal={goals.salt}  color="var(--macro-warning)" />
      </div>

      {/* Sat fat / sugars / omega3 / alcohol as simple tiles */}
      <div className="macro-tiles-secondary" style={{ marginTop: "var(--space-4)" }}>
        <div className="macro-tile">
          <span className="macro-tile__value" style={{ color: "var(--macro-fat)" }}>{Math.round(totals.satFat * 10) / 10}</span>
          <span className="macro-tile__label">Sat Fat</span>
          <span className="macro-tile__unit">g</span>
        </div>
        <div className="macro-tile">
          <span className="macro-tile__value" style={{ color: "var(--macro-carbs)" }}>{Math.round(totals.addedSugar * 10) / 10}</span>
          <span className="macro-tile__label">Added Sugar</span>
          <span className="macro-tile__unit">g</span>
        </div>
        <div className="macro-tile">
          <span className="macro-tile__value" style={{ color: "var(--macro-carbs)" }}>{Math.round(totals.naturalSugar * 10) / 10}</span>
          <span className="macro-tile__label">Nat. Sugar</span>
          <span className="macro-tile__unit">g</span>
        </div>
        <div className="macro-tile">
          <span className="macro-tile__value" style={{ color: "var(--macro-fiber)" }}>{Math.round((totals.omega3 ?? 0))}</span>
          <span className="macro-tile__label">Omega-3</span>
          <span className="macro-tile__unit">mg</span>
        </div>
        <div className="macro-tile">
          <span className="macro-tile__value" style={{ color: "var(--macro-warning)" }}>{Math.round((totals.alcohol ?? 0) * 10) / 10}</span>
          <span className="macro-tile__label">Alcohol</span>
          <span className="macro-tile__unit">u</span>
        </div>
        {(totals.steps ?? 0) > 0 && (
          <div className="macro-tile">
            <span className="macro-tile__value" style={{ color: "var(--color-accent)" }}>{(totals.steps ?? 0).toLocaleString()}</span>
            <span className="macro-tile__label">Steps</span>
            <span className="macro-tile__unit"> </span>
          </div>
        )}
      </div>
    </div>
  );
}
