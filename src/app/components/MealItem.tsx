"use client";

import { type LocalMeal } from "@/app/types";
import { MacroBadge } from "@/app/components/MacroBadge";

type Props = {
  meal: LocalMeal;
  onEdit: (meal: LocalMeal) => void;
  onDelete: (id: string) => void;
};

const KCAL_COLOR = "var(--macro-calories)";

const CATEGORY_ICONS: Record<string, string> = {
  Breakfast: "🌅",
  Lunch:     "🥗",
  Dinner:    "🍽️",
  Snack:     "🍎",
  Other:     "☕",
};

export function MealItem({ meal, onEdit, onDelete }: Props) {
  return (
    <div className="meal-item">
      <div className="meal-item__body">
        {/* Name + category chip */}
        <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2)", flexWrap: "wrap" }}>
          <span className="meal-item__name">{meal.name}</span>
          {meal.category && (
            <span style={{
              fontSize: "0.6875rem",
              fontWeight: 700,
              background: "var(--md-surface-container)",
              border: "1px solid var(--md-outline-variant)",
              borderRadius: "var(--radius-full)",
              padding: "2px 8px",
              color: "var(--md-on-surface-variant)",
              whiteSpace: "nowrap",
            }}>
              {CATEGORY_ICONS[meal.category] ?? ""} {meal.category}
            </span>
          )}
        </div>

        {/* Primary macros row */}
        <div className="meal-item__macros-primary">
          <span
            style={{
              fontSize: "0.9375rem",
              fontWeight: 700,
              color: KCAL_COLOR,
              fontVariantNumeric: "tabular-nums",
            }}
          >
            {Math.round(meal.calories)} kcal
          </span>
          <MacroBadge
            label="P"
            value={meal.protein}
            color="var(--macro-protein)"
          />
          <MacroBadge
            label="C"
            value={meal.carbs}
            color="var(--macro-carbs)"
          />
          <MacroBadge label="F" value={meal.fat} color="var(--macro-fat)" />
        </div>

        {/* Secondary macros row */}
        <div className="meal-item__macros-secondary">
          {meal.satFat > 0 && (
            <MacroBadge label="Sat fat" value={meal.satFat} dim />
          )}
          {meal.fibre > 0 && (
            <MacroBadge
              label="Fibre"
              value={meal.fibre}
              color="var(--macro-fiber)"
              dim
            />
          )}
          {meal.addedSugar > 0 && (
            <MacroBadge label="Added sugar" value={meal.addedSugar} dim />
          )}
          {meal.naturalSugar > 0 && (
            <MacroBadge label="Nat. sugar" value={meal.naturalSugar} dim />
          )}
          {meal.salt > 0 && <MacroBadge label="Salt" value={meal.salt} dim />}
          {meal.alcohol > 0 && (
            <MacroBadge label="Alcohol" value={meal.alcohol} unit="u" dim />
          )}
          {meal.omega3 > 0 && (
            <MacroBadge label="Omega-3" value={meal.omega3} unit="mg" dim />
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="meal-item__actions">
        <button
          className="btn-ghost btn-sm"
          onClick={() => onEdit(meal)}
          aria-label={`Edit ${meal.name}`}
          title="Edit meal"
        >
          ✏️
        </button>
        <button
          className="btn-danger-ghost btn-sm"
          onClick={() => onDelete(meal.id)}
          aria-label={`Delete ${meal.name}`}
          title="Delete meal"
        >
          🗑
        </button>
      </div>
    </div>
  );
}
