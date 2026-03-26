"use client";

import { useState, useEffect, type FormEvent } from "react";
import { type MealFormValues, type SavedMeal, EMPTY_FORM_VALUES } from "@/app/types";
import { MacroInput }       from "@/app/components/MacroInput";
import { SavedMealPicker }  from "@/app/components/SavedMealPicker";

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
  const [values, setValues] = useState<MealFormValues>(initialValues ?? EMPTY_FORM_VALUES);
  const [error,  setError]  = useState<string | null>(null);
  const [saved,  setSaved]  = useState(false);

  useEffect(() => {
    setValues(initialValues ?? EMPTY_FORM_VALUES);
    setError(null);
    setSaved(false);
  }, [initialValues]);

  function setField<K extends keyof MealFormValues>(key: K, raw: string) {
    if (key === "name") {
      setValues((prev) => ({ ...prev, name: raw }));
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
      .filter((k) => k !== "name")
      .some((k) => (values[k] as number) < 0);
    if (anyNeg) { setError("Macro values cannot be negative."); return; }
    setError(null);
    onSubmit(values);
    if (!isEditing) setValues(EMPTY_FORM_VALUES);
    setSaved(false);
  }

  function handleSaveTemplate() {
    if (!values.name.trim()) {
      setError("Enter a meal name before saving as template."); return;
    }
    onSaveTemplate?.(values);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  return (
    <div
      className="card"
      style={{
        padding: "var(--space-5) var(--space-6)",
        marginBottom: "var(--space-5)",
        outline: isEditing ? "2px solid var(--color-border-focus)" : "none",
        outlineOffset: "2px",
      }}
    >
      <h2 style={{ fontSize: "1rem", fontWeight: 600, marginBottom: "var(--space-4)" }}>
        {isEditing ? "Edit meal" : "Add meal"}
      </h2>

      {!isEditing && savedMeals && savedMeals.length > 0 && onDeleteSaved && (
        <div style={{ marginBottom: "var(--space-4)" }}>
          <SavedMealPicker
            savedMeals={savedMeals}
            onSelect={loadSavedMeal}
            onDelete={onDeleteSaved}
          />
        </div>
      )}

      <form onSubmit={handleSubmit} className="stack" style={{ gap: "var(--space-4)" }}>
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

        <div>
          <p className="form-section-label">Also tracking</p>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(130px, 1fr))",
              gap: "var(--space-3)",
              marginTop: "var(--space-2)",
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
        </div>

        {error && (
          <p
            style={{
              fontSize: "0.875rem",
              color: "var(--color-danger)",
              background: "var(--color-danger-light)",
              padding: "var(--space-2) var(--space-3)",
              borderRadius: "var(--radius-sm)",
            }}
          >
            {error}
          </p>
        )}

        <div
          className="row"
          style={{ justifyContent: "space-between", flexWrap: "wrap", gap: "var(--space-2)" }}
        >
          <div className="row gap-3">
            <button type="submit" className="btn-primary">
              {isEditing ? "Save changes" : "Add meal"}
            </button>
            {onCancel && (
              <button type="button" className="btn-ghost" onClick={onCancel}>
                Cancel
              </button>
            )}
          </div>
          {onSaveTemplate && !isEditing && (
            <button
              type="button"
              className="btn-ghost btn-sm"
              onClick={handleSaveTemplate}
              style={{ color: saved ? "var(--color-accent)" : undefined }}
            >
              {saved ? "Saved!" : "Save template"}
            </button>
          )}
        </div>
      </form>
    </div>
  );
}
