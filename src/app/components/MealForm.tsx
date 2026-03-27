"use client";

import { useState, useEffect, type FormEvent } from "react";
import { type MealFormValues, type SavedMeal, EMPTY_FORM_VALUES } from "@/app/types";
import { MacroInput }       from "@/app/components/MacroInput";
import { SavedMealPicker }  from "@/app/components/SavedMealPicker";

export const MEAL_CATEGORIES = ["Breakfast", "Lunch", "Dinner", "Snack", "Other"] as const;
export type MealCategory = typeof MEAL_CATEGORIES[number];

const CATEGORY_ICONS: Record<string, string> = {
  Breakfast: "🌅",
  Lunch:     "🥗",
  Dinner:    "🍽️",
  Snack:     "🍎",
  Other:     "☕",
};

type Props = {
  initialValues?: MealFormValues;
  savedMeals?:    SavedMeal[];
  onSubmit:       (values: MealFormValues) => void;
  onCancel?:      () => void;
  onSaveTemplate?:(values: MealFormValues) => void;
  onDeleteSaved?: (id: string) => void;
};

type NumericField = Exclude<keyof MealFormValues, "name" | "category">;

const ALL_FIELDS: { key: NumericField; label: string }[] = [
  { key: "calories",     label: "Calories (kcal)" },
  { key: "protein",      label: "Protein (g)"     },
  { key: "carbs",        label: "Carbs (g)"        },
  { key: "fat",          label: "Fat (g)"          },
  { key: "satFat",       label: "Sat Fat (g)"      },
  { key: "fibre",        label: "Fibre (g)"        },
  { key: "addedSugar",   label: "Added Sugar (g)"  },
  { key: "naturalSugar", label: "Natural Sugar (g)"},
  { key: "salt",         label: "Salt (g)"         },
  { key: "alcohol",      label: "Alcohol (units)"  },
  { key: "omega3",       label: "Omega-3 (mg)"     },
];

export function MealForm({
  initialValues, savedMeals, onSubmit, onCancel, onSaveTemplate, onDeleteSaved,
}: Props) {
  const isEditing = Boolean(initialValues);
  const [values, setValues] = useState<MealFormValues>(initialValues ?? EMPTY_FORM_VALUES);
  const [error,  setError]  = useState<string | null>(null);
  const [saved,  setSaved]  = useState(false);

  useEffect(() => {
    setValues(initialValues ?? EMPTY_FORM_VALUES);
    setError(null);
    setSaved(false);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialValues]);

  function setField<K extends keyof MealFormValues>(key: K, raw: string) {
    if (key === "name") {
      setValues((prev) => ({ ...prev, name: raw }));
    } else if (key === "category") {
      setValues((prev) => ({ ...prev, category: raw === "" ? null : raw }));
    } else {
      const num = parseFloat(raw);
      setValues((prev) => ({ ...prev, [key]: isNaN(num) ? 0 : num }));
    }
  }

  function loadSavedMeal(meal: SavedMeal) {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { id: _id, ...vals } = meal;
    setValues(vals);
    setError(null);
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!values.name.trim()) { setError("Meal name is required."); return; }
    if (values.calories < 0 || values.calories >= 10000) {
      setError("Calories must be 0 to 9999."); return;
    }
    const anyNeg = (Object.keys(EMPTY_FORM_VALUES) as (keyof MealFormValues)[])
      .filter((k) => k !== "name" && k !== "category")
      .some((k) => (values[k] as number) < 0);
    if (anyNeg) { setError("Macro values cannot be negative."); return; }
    setError(null);
    onSubmit(values);
    if (!isEditing) setValues(EMPTY_FORM_VALUES);
    setSaved(false);
  }

  function handleSaveTemplate() {
    if (!values.name.trim()) { setError("Enter a meal name before saving as template."); return; }
    onSaveTemplate?.(values);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  }

  return (
    <div
      className="card"
      style={{
        padding: "var(--space-6)",
        background: isEditing ? "var(--md-surface-bright)" : undefined,
        outline: isEditing ? `2px solid var(--md-primary-container)` : "none",
        outlineOffset: "2px",
      }}
    >
      {/* Header */}
      <div className="row" style={{ justifyContent: "space-between", alignItems: "center", marginBottom: "var(--space-6)" }}>
        <div>
          <h2 style={{ fontSize: "1rem", fontWeight: 800, letterSpacing: "-0.025em" }}>
            {isEditing ? "✏️ Edit meal" : "➕ Log meal"}
          </h2>
          {isEditing && (
            <p style={{ fontSize: "0.75rem", color: "var(--md-primary-container)", marginTop: 3, fontWeight: 600 }}>
              Update the details below, then save when you're ready.
            </p>
          )}
        </div>
        {isEditing && onCancel && (
          <button type="button" className="btn-ghost btn-sm" onClick={onCancel}>✕ Cancel</button>
        )}
      </div>

      {/* Saved meal picker */}
      {!isEditing && savedMeals && savedMeals.length > 0 && onDeleteSaved && (
        <div style={{ marginBottom: "var(--space-6)" }}>
          <SavedMealPicker savedMeals={savedMeals} onSelect={loadSavedMeal} onDelete={onDeleteSaved} />
        </div>
      )}

      <form onSubmit={handleSubmit} className="stack" style={{ gap: "var(--space-5)" }}>
        {/* Meal name */}
        <div className="macro-input">
          <label htmlFor="meal-name">Meal name</label>
          <input
            id="meal-name"
            type="text"
            placeholder="e.g. Chicken and rice"
            value={values.name}
            onChange={(e) => setField("name", e.target.value)}
            autoComplete="off"
            style={{ fontSize: "1rem", fontWeight: 600 }}
          />
        </div>

        {/* Category chips */}
        <div>
          <label>Category</label>
          <div style={{ display: "flex", gap: "var(--space-2)", flexWrap: "wrap", marginTop: "var(--space-2)" }}>
            <button
              type="button"
              onClick={() => setField("category", "")}
              style={{
                padding: "6px 14px", borderRadius: "var(--radius-full)", border: "none",
                background: values.category === null ? "var(--md-surface-bright)" : "var(--md-surface-container-highest)",
                color: values.category === null ? "var(--md-on-surface)" : "var(--md-on-surface-variant)",
                fontSize: "0.8125rem", fontWeight: 700, cursor: "pointer",
                transition: "background var(--transition), color var(--transition)",
              }}
            >— None</button>
            {MEAL_CATEGORIES.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setValues((prev) => ({ ...prev, category: cat }))}
                style={{
                  padding: "6px 14px", borderRadius: "var(--radius-full)", border: "none",
                  background: values.category === cat ? "var(--md-tertiary-container)" : "var(--md-surface-container-highest)",
                  color: values.category === cat ? "var(--md-on-tertiary-container)" : "var(--md-on-surface-variant)",
                  fontSize: "0.8125rem", fontWeight: 700, cursor: "pointer",
                  transition: "background var(--transition), color var(--transition)",
                }}
              >{CATEGORY_ICONS[cat]} {cat}</button>
            ))}
          </div>
        </div>

        {/* All nutrient fields – always visible */}
        <div>
          <p className="form-section-label" style={{ marginBottom: "var(--space-3)" }}>Nutrients</p>
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(130px, 1fr))",
            gap: "var(--space-3)",
          }}>
            {ALL_FIELDS.map(({ key, label }) => (
              <MacroInput
                key={key}
                id={"meal-" + key}
                label={label}
                value={values[key] as number}
                onChange={(raw) => setField(key, raw)}
              />
            ))}
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="alert-error"><span>⚠️</span><span>{error}</span></div>
        )}

        {/* Actions */}
        <div className="row" style={{ justifyContent: "space-between", flexWrap: "wrap", gap: "var(--space-3)" }}>
          <div className="row gap-3">
            <button type="submit" className="btn-primary">
              {isEditing ? "Save changes" : "Add meal"}
            </button>
            {onCancel && !isEditing && (
              <button type="button" className="btn-ghost" onClick={onCancel}>Cancel</button>
            )}
          </div>
          {onSaveTemplate && (
            <button
              type="button"
              className={saved ? "btn-tonal btn-sm" : "btn-ghost btn-sm"}
              onClick={handleSaveTemplate}
            >
              {saved ? "✓ Saved!" : isEditing ? "Save as template" : "Save template"}
            </button>
          )}
        </div>
      </form>
    </div>
  );
}
