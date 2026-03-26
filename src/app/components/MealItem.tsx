"use client";

import { type LocalMeal } from "@/app/types";
import { MacroBadge } from "@/app/components/MacroBadge";

type Props = {
  meal: LocalMeal;
  onEdit: (meal: LocalMeal) => void;
  onDelete: (id: string) => void;
};

export function MealItem({ meal, onEdit, onDelete }: Props) {
  return (
    <div className="meal-item">
      {/* Body */}
      <div className="meal-item__body">
        <span className="meal-item__name">{meal.name}</span>

        {/* Primary macros */}
        <div className="meal-item__macros-primary">
          <MacroBadge
            label=""
            value={meal.calories}
            unit=" kcal"
            color="var(--macro-calories)"
          />
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

        {/* Secondary macros */}
        <div className="meal-item__macros-secondary">
          <MacroBadge label="Sat fat" value={meal.satFat} dim />
          <MacroBadge label="Fibre" value={meal.fibre} color="var(--macro-fiber)" dim />
          <MacroBadge label="Added sugar" value={meal.addedSugar} dim />
          <MacroBadge label="Nat. sugar" value={meal.naturalSugar} dim />
          <MacroBadge label="Salt" value={meal.salt} dim />
          {meal.alcohol > 0 && <MacroBadge label="Alcohol" value={meal.alcohol} unit="u" dim />}
          {meal.omega3 > 0 && <MacroBadge label="Omega-3" value={meal.omega3} unit="mg" dim />}
        </div>
      </div>

      {/* Actions */}
      <div className="meal-item__actions">
        <button
          className="btn-ghost btn-sm"
          onClick={() => onEdit(meal)}
          aria-label={`Edit ${meal.name}`}
          title="Edit"
        >
          ✏️
        </button>
        <button
          className="btn-danger-ghost btn-sm"
          onClick={() => onDelete(meal.id)}
          aria-label={`Delete ${meal.name}`}
          title="Delete"
        >
          🗑
        </button>
      </div>
    </div>
  );
}
