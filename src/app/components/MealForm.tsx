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

type NumericField = Exclude<keyof MealFormValues, "name">;

const PRIMARY_FIELDS: { key: NumericField; label: string }[] = [
  { key: "calories", label: "Calories (kcal)" },
  { key: "protein",  label: "Protein (g)" },
  { key: "carbs",    label: "Carbs (g)" },
  { key: "fat",      label: "Fat (g)" },
];

const SECONDARY_FIELDS: { key: NumericField; label: string }[] = [
  { key: "satFat",       label: "Sat Fat (g)" },
  { key: "fibre",        label: "Fibre (g)" },
  { key: "addedSugar",   label: "Added Sugar (g)" },
  { key: "naturalSugar", label: "Natural Sugar (g)" },
  { key: "salt",         label: "Salt (g)" },
  { key: "alcohol",      label: "Alcohol (units)" },
  { key: "omega3",       label: "Omega-3 (mg)" },
];

export function MealForm({
  initialValues, savedMeals, onSubmit, onCancel, onSaveTemplate, onDeleteSaved,
}: Props) {
  const isEditing = Boolean(initialValues);
  const [values,   setValues]   = useState<MealFormValues>(initialValues ?? EMPTY_FORM_VALUES);
  const [error,    setError]    = useState<string | null>(null);
  const [saved,    setSaved]    = useState(false);
  const [showMore, setShowMore] = useState(false);

  // Check if any secondary field has a value already so we expand automatically
  const hasSecondaryValues = SECONDARY_FIELDS.some(({ key }) => (values[key] as number) > 0);

  useEffect(() => {
    setValues(initialValues ?? EMPTY_FORM_VALUES);
    setError(null);
    setSaved(false);
    setShowMore(isEditing && SECONDARY_FIELDS.some(({ key }) => ((initialValues?.[key] as number) ?? 0) > 0));
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
    setShowMore(SECONDARY_FIELDS.some(({ key }) => (vals[key] as number) > 0));
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!values.name.trim()) { setError("Meal name is required."); return; }
    if (values.calories < 0 || values.calories >= 10000) {
      setError("Calories must be 0 to 9999."); return;
    }
    const anyNeg = (Object.keys(EMPTY_FORM_VALUES) as (keyof MealFormValues)[])
      .filter((k) => k !== "name")
      .some((k) => (values[k] as number) < 0);
    if (anyNeg) { setError("Macro values cannot be negative."); return; }
    setError(null);
    onSubmit(values);
    if (!isEditing) {
      setValues(EMPTY_FORM_VALUES);
      setShowMore(false);
    }
    setSaved(false);
  }

  function handleSaveTemplate() {
    if (!values.name.trim()) {
      setError("Enter a meal name before saving as template."); return;
    }
    onSaveTemplate?.(values);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  }

  return (
    <div
      className="card"
      style={{
        padding: "var(--space-5) var(--space-6)",
        outline: isEditing ? "2px solid var(--md-primary)" : "none",
        outlineOffset: "2px",
      }}
    >
      {/* Card header */}
      <div className="row" style={{ justifyContent: "space-between", alignItems: "center", marginBottom: "var(--space-5)" }}>
        <div>
          <h2 style={{ fontSize: "1rem", fontWeight: 700, letterSpacing: "-0.02em" }}>
            {isEditing ? "✏️ Edit meal" : "➕ Add meal"}
          </h2>
          {isEditing && (
            <p style={{ fontSize: "0.75rem", color: "var(--md-primary)", marginTop: 2, fontWeight: 500 }}>
              Editing — changes will be saved to the database
            </p>
          )}
        </div>
        {isEditing && onCancel && (
          <button type="button" className="btn-ghost btn-sm" onClick={onCancel}>
            ✕ Cancel
          </button>
        )}
      </div>

      {/* Saved meal picker */}
      {!isEditing && savedMeals && savedMeals.length > 0 && onDeleteSaved && (
        <div style={{ marginBottom: "var(--space-5)" }}>
          <SavedMealPicker
            savedMeals={savedMeals}
            onSelect={loadSavedMeal}
            onDelete={onDeleteSaved}
          />
        </div>
      )}

      <form onSubmit={handleSubmit} className="stack" style={{ gap: "var(--space-4)" }}>
        {/* Meal name */}
        <div>
          <label htmlFor="meal-name">Meal name</label>
          <input
            id="meal-name"
            type="text"
            placeholder="e.g. Chicken and rice"
            value={values.name}
            onChange={(e) => setField("name", e.target.value)}
            autoComplete="off"
          />
        </div>

        {/* Category */}
        <div>
          <label htmlFor="meal-category">Category</label>
          <div style={{ display: "flex", gap: "var(--space-2)", flexWrap: "wrap" }}>
            {/* No category option */}
            <button
              type="button"
              onClick={() => setField("category", "")}
              style={{
                padding: "var(--space-1) var(--space-3)",
                borderRadius: "var(--radius-full)",
                border: `1.5px solid ${values.category === null ? "var(--md-outline-variant)" : "var(--md-outline-variant)"}`,
                background: values.category === null ? "var(--md-surface-container)" : "transparent",
                color: values.category === null ? "var(--md-on-surface)" : "var(--md-on-surface-variant)",
                fontSize: "0.8125rem",
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              — None
            </button>
            {MEAL_CATEGORIES.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setValues((prev) => ({ ...prev, category: cat }))}
                style={{
                  padding: "var(--space-1) var(--space-3)",
                  borderRadius: "var(--radius-full)",
                  border: `1.5px solid ${values.category === cat ? "var(--md-primary)" : "var(--md-outline-variant)"}`,
                  background: values.category === cat ? "var(--md-primary-container)" : "transparent",
                  color: values.category === cat ? "var(--md-on-primary-container)" : "var(--md-on-surface-variant)",
                  fontSize: "0.8125rem",
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                {CATEGORY_ICONS[cat]} {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Primary macros */}
        <div>
          <p className="form-section-label">Macros</p>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(130px, 1fr))",
              gap: "var(--space-3)",
              marginTop: "var(--space-2)",
            }}
          >
            {PRIMARY_FIELDS.map(({ key, label }) => (
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

        {/* Collapsible secondary nutrients */}
        <div>
          <button
            type="button"
            className="collapsible-trigger"
            onClick={() => setShowMore((v) => !v)}
            style={{ border: "none", background: "none", padding: "var(--space-2) 0", width: "100%", textAlign: "left" }}
          >
            <span style={{ fontSize: "0.875rem" }}>{showMore ? "▾" : "▸"}</span>
            <span>
              {showMore ? "Hide" : "Add"} nutrients
              {!showMore && hasSecondaryValues && (
                <span style={{ marginLeft: 6, background: "var(--md-primary-container)", color: "var(--md-on-primary-container)", fontSize: "0.6875rem", fontWeight: 700, padding: "1px 6px", borderRadius: "var(--radius-full)" }}>
                  filled
                </span>
              )}
            </span>
          </button>

          {(showMore || hasSecondaryValues) && (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(130px, 1fr))",
                gap: "var(--space-3)",
                marginTop: "var(--space-2)",
                padding: "var(--space-4)",
                background: "var(--md-surface-container-low)",
                borderRadius: "var(--radius-lg)",
                border: "1px solid var(--md-outline-variant)",
              }}
            >
              {SECONDARY_FIELDS.map(({ key, label }) => (
                <MacroInput
                  key={key}
                  id={"meal-" + key}
                  label={label}
                  value={values[key] as number}
                  onChange={(raw) => setField(key, raw)}
                />
              ))}
            </div>
          )}
        </div>

        {/* Error message */}
        {error && (
          <div className="alert-error">
            <span>⚠️</span>
            <span>{error}</span>
          </div>
        )}

        {/* Actions */}
        <div className="row" style={{ justifyContent: "space-between", flexWrap: "wrap", gap: "var(--space-2)" }}>
          <div className="row gap-3">
            <button type="submit" className="btn-primary">
              {isEditing ? "Save changes" : "Add meal"}
            </button>
            {onCancel && !isEditing && (
              <button type="button" className="btn-ghost" onClick={onCancel}>
                Cancel
              </button>
            )}
          </div>
          {onSaveTemplate && !isEditing && (
            <button
              type="button"
              className={saved ? "btn-tonal btn-sm" : "btn-ghost btn-sm"}
              onClick={handleSaveTemplate}
            >
              {saved ? "✓ Saved!" : "Save as template"}
            </button>
          )}
        </div>
      </form>
    </div>
  );
}
