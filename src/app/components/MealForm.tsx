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
  const [collapsed, setCollapsed] = useState(!isEditing);

  // AI estimation state
  const [aiPrompt,  setAiPrompt]  = useState("");
  const [aiLoading, setAiLoading] = useState(false);

  useEffect(() => {
    setValues(initialValues ?? EMPTY_FORM_VALUES);
    setError(null);
    setSaved(false);
    if (initialValues) setCollapsed(false);
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

  async function handleAiEstimate() {
    const text = aiPrompt.trim();
    if (!text) { setError("Describe what you ate so AI can estimate nutrition."); return; }
    setAiLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/ai-log", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ description: text }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.error ?? `Request failed (${res.status})`);
      }
      const data = await res.json();
      setValues({
        name:         data.name         ?? "",
        category:     data.category     ?? null,
        calories:     data.calories     ?? 0,
        protein:      data.protein      ?? 0,
        carbs:        data.carbs        ?? 0,
        fat:          data.fat          ?? 0,
        satFat:       data.satFat       ?? 0,
        fibre:        data.fibre        ?? 0,
        addedSugar:   data.addedSugar   ?? 0,
        naturalSugar: data.naturalSugar ?? 0,
        salt:         data.salt         ?? 0,
        alcohol:      data.alcohol      ?? 0,
        omega3:       data.omega3       ?? 0,
      });
      setAiPrompt("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "AI estimation failed.");
    } finally {
      setAiLoading(false);
    }
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
      <div
        className="row"
        style={{
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: collapsed ? 0 : "var(--space-6)",
          cursor: isEditing ? undefined : "pointer",
          userSelect: isEditing ? undefined : "none",
        }}
        onClick={isEditing ? undefined : () => setCollapsed((c) => !c)}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2)" }}>
          {!isEditing && (
            <span style={{
              fontSize: "0.75rem",
              transition: "transform 0.2s ease",
              transform: collapsed ? "rotate(-90deg)" : "rotate(0deg)",
              display: "inline-block",
            }}>
              ▼
            </span>
          )}
          <div>
            <h2 style={{ fontSize: "1rem", fontWeight: 800, letterSpacing: "-0.025em" }}>
              {isEditing ? "✏️ Edit meal" : "➕ Log meal"}
            </h2>
            {isEditing && (
              <p style={{ fontSize: "0.75rem", color: "var(--md-primary-container)", marginTop: 3, fontWeight: 600 }}>
                Update the details below, then save when you&apos;re ready.
              </p>
            )}
          </div>
        </div>
        {isEditing && onCancel && (
          <button type="button" className="btn-ghost btn-sm" onClick={onCancel}>✕ Cancel</button>
        )}
      </div>

      {!collapsed && (
        <>
          {/* AI estimation */}
          {!isEditing && (
            <div style={{
              marginBottom: "var(--space-5)",
              padding: "var(--space-4) var(--space-5)",
              borderRadius: "var(--radius-lg)",
              background: "linear-gradient(135deg, rgba(104,185,132,0.06) 0%, rgba(104,185,132,0.02) 100%)",
              border: "1px solid rgba(104,185,132,0.15)",
            }}>
              <div style={{
                display: "flex", alignItems: "center", gap: "var(--space-2)",
                marginBottom: "var(--space-3)",
              }}>
                <span style={{ fontSize: "1.1rem" }}>✨</span>
                <span style={{
                  fontSize: "0.75rem", fontWeight: 800, textTransform: "uppercase",
                  letterSpacing: "0.06em", color: "var(--md-primary)",
                }}>
                  AI Estimate
                </span>
              </div>
              <div style={{ display: "flex", gap: "var(--space-2)" }}>
                <input
                  type="text"
                  placeholder="e.g. 200g chicken breast with rice and broccoli"
                  value={aiPrompt}
                  onChange={(e) => setAiPrompt(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") { e.preventDefault(); handleAiEstimate(); }
                  }}
                  disabled={aiLoading}
                  style={{
                    flex: 1,
                    fontSize: "0.9375rem",
                    fontWeight: 500,
                    background: "var(--md-surface-container)",
                    border: "1px solid var(--md-outline-variant)",
                    borderRadius: "var(--radius-full)",
                    padding: "10px var(--space-4)",
                    color: "var(--md-on-surface)",
                    outline: "none",
                  }}
                />
                <button
                  type="button"
                  onClick={handleAiEstimate}
                  disabled={aiLoading || !aiPrompt.trim()}
                  className="btn-primary btn-sm"
                  style={{
                    borderRadius: "var(--radius-full)",
                    padding: "10px var(--space-5)",
                    whiteSpace: "nowrap",
                    flexShrink: 0,
                  }}
                >
                  {aiLoading ? "Estimating…" : "✨ Estimate"}
                </button>
              </div>
              <p style={{
                fontSize: "0.6875rem", color: "var(--md-on-surface-variant)",
                marginTop: "var(--space-2)", lineHeight: 1.4,
              }}>
                Describe your meal with quantities — AI fills all nutrition fields for you.
              </p>
            </div>
          )}

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

            {/* All nutrient fields */}
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
        </>
      )}
    </div>
  );
}
