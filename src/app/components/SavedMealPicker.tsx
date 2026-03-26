"use client";

import { type SavedMeal } from "@/app/types";

type Props = {
  savedMeals:   SavedMeal[];
  onSelect:     (meal: SavedMeal) => void;
  onDelete:     (id: string) => void;
};

export function SavedMealPicker({ savedMeals, onSelect, onDelete }: Props) {
  if (savedMeals.length === 0) return null;

  return (
    <div className="saved-meal-picker">
      <label htmlFor="saved-meal-select">Load saved meal</label>
      <div className="saved-meal-picker__row">
        <select
          id="saved-meal-select"
          defaultValue=""
          onChange={(e) => {
            const meal = savedMeals.find((m) => m.id === e.target.value);
            if (meal) onSelect(meal);
            e.target.value = "";
          }}
          style={{ flex: 1 }}
        >
          <option value="" disabled>
            — choose a template —
          </option>
          {savedMeals.map((m) => (
            <option key={m.id} value={m.id}>
              {m.name} ({Math.round(m.calories)} kcal)
            </option>
          ))}
        </select>
      </div>
      {savedMeals.length > 0 && (
        <div className="saved-meal-picker__list">
          {savedMeals.map((m) => (
            <div key={m.id} className="saved-meal-picker__chip">
              <span>{m.name}</span>
              <button
                type="button"
                className="btn-danger-ghost btn-sm"
                onClick={() => onDelete(m.id)}
                aria-label={`Remove template ${m.name}`}
                title="Remove template"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

