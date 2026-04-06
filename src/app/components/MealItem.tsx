"use client";

import { type LocalMeal } from "@/app/types";
import { MacroBadge } from "@/app/components/MacroBadge";
import { getNutrientStatus } from "@/app/components/nutrientStatus";

type Props = {
  meal: LocalMeal;
  onEdit: (meal: LocalMeal) => void;
  onDelete: (id: string) => void;
  mergeMode?: boolean;
  selected?: boolean;
  onSelect?: (id: string) => void;
};

const CATEGORY_ICONS: Record<string, string> = {
  Breakfast: "🌅",
  Lunch:     "🥗",
  Dinner:    "🍽️",
  Snack:     "🍎",
  Other:     "☕",
};

export function MealItem({ meal, onEdit, onDelete, mergeMode, selected, onSelect }: Props) {
  return (
    <div
      className={`meal-item${mergeMode && selected ? " meal-item--selected" : ""}`}
      onClick={mergeMode ? () => onSelect?.(meal.id) : undefined}
      style={mergeMode ? { cursor: "pointer" } : undefined}
    >
      <div className="meal-item__body">
        {/* Name + category chip */}
        <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2)", flexWrap: "wrap" }}>
          <span className="meal-item__name">{meal.name}</span>
          {meal.category && (
            <span className="category-badge">
              {CATEGORY_ICONS[meal.category] ?? ""} {meal.category}
            </span>
          )}
        </div>

        {/* All macros in a single consistent row */}
        <div className="meal-item__macros">
          <MacroBadge label="Kcal"       value={meal.calories}     unit=" kcal" status={getNutrientStatus("calories", meal.calories)} />
          <MacroBadge label="Protein"    value={meal.protein}                   status={getNutrientStatus("protein", meal.protein)} />
          <MacroBadge label="Carbs"      value={meal.carbs}                     status={getNutrientStatus("carbs", meal.carbs)} />
          <MacroBadge label="Fat"        value={meal.fat}                       status={getNutrientStatus("fat", meal.fat)} />
          {meal.satFat > 0 && (
            <MacroBadge label="Sat fat"    value={meal.satFat}                  status={getNutrientStatus("satFat", meal.satFat)} />
          )}
          {meal.fibre > 0 && (
            <MacroBadge label="Fibre"      value={meal.fibre}                   status={getNutrientStatus("fibre", meal.fibre)} />
          )}
          {meal.addedSugar > 0 && (
            <MacroBadge label="Sugar"      value={meal.addedSugar}              status={getNutrientStatus("addedSugar", meal.addedSugar)} />
          )}
          {meal.naturalSugar > 0 && (
            <MacroBadge label="Nat. sugar" value={meal.naturalSugar}            status={getNutrientStatus("naturalSugar", meal.naturalSugar)} />
          )}
          {meal.salt > 0 && (
            <MacroBadge label="Salt"       value={meal.salt}                    status={getNutrientStatus("salt", meal.salt)} />
          )}
          {meal.alcohol > 0 && (
            <MacroBadge label="Alcohol"    value={meal.alcohol}    unit=" u"    status={getNutrientStatus("alcohol", meal.alcohol)} />
          )}
          {meal.omega3 > 0 && (
            <MacroBadge label="Omega-3"    value={meal.omega3}     unit=" mg"   status={getNutrientStatus("omega3", meal.omega3)} />
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="meal-item__actions">
        {mergeMode ? (
          <div
            style={{
              width: 22, height: 22, borderRadius: "50%",
              border: `2px solid ${selected ? "var(--md-primary)" : "var(--md-outline-variant)"}`,
              background: selected ? "var(--md-primary)" : "transparent",
              display: "flex", alignItems: "center", justifyContent: "center",
              flexShrink: 0, transition: "background 0.15s, border-color 0.15s",
            }}
            aria-hidden="true"
          >
            {selected && <span style={{ color: "var(--md-on-primary)", fontSize: "0.75rem", fontWeight: 900 }}>✓</span>}
          </div>
        ) : (
          <>
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
          </>
        )}
      </div>
    </div>
  );
}
