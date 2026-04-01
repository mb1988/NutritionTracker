"use client";

import { useState, useEffect, type FormEvent } from "react";
import { type MealFormValues, type SavedMeal, EMPTY_FORM_VALUES } from "@/app/types";
import { BarcodeScanner } from "@/app/components/BarcodeScanner";
import { MacroInput }       from "@/app/components/MacroInput";
import { SavedMealPicker }  from "@/app/components/SavedMealPicker";
import { normalizeBarcodeValue } from "@/app/components/barcodeScannerSupport";

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
type AssistModelTier = "balanced" | "accurate";

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
  const [productLookup, setProductLookup] = useState("");
  const [lookupAmount, setLookupAmount] = useState("");
  const [modelTier, setModelTier] = useState<AssistModelTier>("accurate");
  const [assistMessage, setAssistMessage] = useState<string | null>(null);
  const [scannerOpen, setScannerOpen] = useState(false);

  useEffect(() => {
    setValues(initialValues ?? EMPTY_FORM_VALUES);
    setError(null);
    setSaved(false);
    setAssistMessage(null);
    if (initialValues) setCollapsed(false);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialValues]);

  useEffect(() => {
    if (isEditing) {
      setScannerOpen(false);
    }
  }, [isEditing]);

  function resetComposerState(nextValues: MealFormValues = EMPTY_FORM_VALUES) {
    setValues(nextValues);
    setError(null);
    setSaved(false);
    setAiPrompt("");
    setProductLookup("");
    setLookupAmount("");
    setAssistMessage(null);
    setScannerOpen(false);
  }

  function applyAutofill(data: MealFormValues, message: string) {
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
    setAssistMessage(message);
  }

  async function requestAutofill(payload: Record<string, unknown>) {
    const res = await fetch("/api/ai-log", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const body = await res.json().catch(() => null);
      throw new Error(body?.error ?? `Request failed (${res.status})`);
    }

    return await res.json() as MealFormValues;
  }

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
    resetComposerState(vals);
  }

  async function handleAiEstimate() {
    const text = aiPrompt.trim();
    if (!text) { setError("Tell the assistant what you ate so it can fill the form."); return; }
    setAiLoading(true);
    setError(null);
    setAssistMessage(null);
    try {
      const data = await requestAutofill({ mode: "describe", description: text, modelTier });
      applyAutofill(data, modelTier === "accurate"
        ? "Filled from your meal description."
        : "Filled from your meal description using budget mode.");
      setAiPrompt("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not fill the form from that description.");
    } finally {
      setAiLoading(false);
    }
  }

  async function handleProductLookup(rawOverride?: string) {
    const raw = (rawOverride ?? productLookup).trim();
    if (!raw) {
      setError("Enter a barcode or product name to look it up.");
      return;
    }

    const amount = lookupAmount.trim() ? Number(lookupAmount) : undefined;
    if (lookupAmount.trim() && (!Number.isFinite(amount) || Number(amount) <= 0)) {
      setError("Amount must be a positive number in g/ml.");
      return;
    }

    const barcode = normalizeBarcodeValue(raw);
    const isBarcode = /^\d{8,14}$/.test(barcode);

    setAiLoading(true);
    setError(null);
    setAssistMessage(null);
    try {
      const data = await requestAutofill(isBarcode
        ? { mode: "barcode", barcode, amount, modelTier }
        : { mode: "productSearch", query: raw, amount, modelTier });
      applyAutofill(
        data,
        isBarcode
          ? "Filled from barcode lookup."
          : "Filled from product search.",
      );
      setProductLookup("");
      setScannerOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not find nutrition for that product.");
    } finally {
      setAiLoading(false);
    }
  }

  function handleScannerDetected(barcode: string) {
    setProductLookup(barcode);
    void handleProductLookup(barcode);
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
    if (!isEditing) {
      resetComposerState();
      return;
    }
    setSaved(false);
  }

  function handleSaveTemplate() {
    if (!values.name.trim()) { setError("Enter a meal name before saving as template."); return; }
    onSaveTemplate?.(values);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  }

  function handleClearForm() {
    resetComposerState();
    onCancel?.();
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
                  Quick fill
                </span>
              </div>
              <div style={{ display: "flex", gap: "var(--space-2)", alignItems: "center", marginBottom: "var(--space-3)", flexWrap: "wrap" }}>
                <label style={{ fontSize: "0.75rem", fontWeight: 700, color: "var(--md-on-surface-variant)" }} htmlFor="meal-model-tier">
                  Assistant mode
                </label>
                <select
                  id="meal-model-tier"
                  value={modelTier}
                  onChange={(e) => setModelTier(e.target.value as AssistModelTier)}
                  disabled={aiLoading}
                  style={{
                    borderRadius: "var(--radius-full)",
                    border: "1px solid var(--md-outline-variant)",
                    background: "var(--md-surface-container)",
                    color: "var(--md-on-surface)",
                    padding: "8px 12px",
                    fontSize: "0.8125rem",
                    fontWeight: 600,
                  }}
                >
                  <option value="accurate">Best accuracy · GPT-4o</option>
                  <option value="balanced">Lower cost · GPT-4o mini</option>
                </select>
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
                  {aiLoading ? "Filling…" : "✨ Fill from description"}
                </button>
              </div>
              <p style={{
                fontSize: "0.6875rem", color: "var(--md-on-surface-variant)",
                marginTop: "var(--space-2)", lineHeight: 1.4,
              }}>
                Describe what you ate and include rough amounts. The app checks food database matches first, then fills any gaps with AI.
              </p>
              <div style={{ marginTop: "var(--space-4)", paddingTop: "var(--space-4)", borderTop: "1px solid rgba(255,255,255,0.06)" }}>
                <div style={{
                  display: "flex", alignItems: "center", gap: "var(--space-2)",
                  marginBottom: "var(--space-3)",
                }}>
                  <span style={{ fontSize: "1rem" }}>🏷️</span>
                  <span style={{ fontSize: "0.75rem", fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--md-on-surface-variant)" }}>
                    Product lookup
                  </span>
                </div>
                <div style={{ display: "flex", gap: "var(--space-2)", flexWrap: "wrap" }}>
                  <input
                    type="text"
                    placeholder="Paste barcode or type product name"
                    value={productLookup}
                    onChange={(e) => setProductLookup(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        void handleProductLookup();
                      }
                    }}
                    disabled={aiLoading}
                    style={{
                      flex: 1,
                      minWidth: 220,
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
                  <input
                    type="number"
                    min={1}
                    step="1"
                    placeholder="g/ml"
                    value={lookupAmount}
                    onChange={(e) => setLookupAmount(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        void handleProductLookup();
                      }
                    }}
                    disabled={aiLoading}
                    style={{
                      width: 92,
                      fontSize: "0.9375rem",
                      fontWeight: 600,
                      background: "var(--md-surface-container)",
                      border: "1px solid var(--md-outline-variant)",
                      borderRadius: "var(--radius-full)",
                      padding: "10px 12px",
                      color: "var(--md-on-surface)",
                      outline: "none",
                      textAlign: "center",
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => void handleProductLookup()}
                    disabled={aiLoading || !productLookup.trim()}
                    className="btn-tonal btn-sm"
                    style={{ borderRadius: "var(--radius-full)", padding: "10px var(--space-5)", whiteSpace: "nowrap" }}
                  >
                      {aiLoading ? "Looking up…" : "Find product"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setScannerOpen((open) => !open)}
                    disabled={aiLoading}
                    className="btn-ghost btn-sm"
                    style={{ borderRadius: "var(--radius-full)", padding: "10px var(--space-5)", whiteSpace: "nowrap" }}
                  >
                    {scannerOpen ? "Hide scanner" : "📷 Scan with camera"}
                  </button>
                </div>
                <p style={{
                  fontSize: "0.6875rem",
                  color: "var(--md-on-surface-variant)",
                  marginTop: "var(--space-2)",
                  lineHeight: 1.4,
                }}>
                  Enter grams or ml eaten. Leave it blank to use the serving size when available, otherwise 100g/100ml.
                </p>
                {scannerOpen && (
                  <div style={{ marginTop: "var(--space-3)" }}>
                    <BarcodeScanner
                      onDetected={handleScannerDetected}
                      onClose={() => setScannerOpen(false)}
                    />
                  </div>
                )}
              </div>
              {assistMessage && (
                <div style={{
                  marginTop: "var(--space-3)",
                  padding: "10px 12px",
                  borderRadius: "var(--radius-md)",
                  background: "rgba(104, 185, 132, 0.12)",
                  color: "var(--md-primary)",
                  fontSize: "0.75rem",
                  fontWeight: 700,
                }}>
                  ✓ {assistMessage}
                </div>
              )}
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
                {!isEditing && (
                  <button type="button" className="btn-ghost" onClick={handleClearForm}>Clear form</button>
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
