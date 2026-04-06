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

type BarcodeConfirm = {
  productName: string;
  baseData: MealFormValues;
  servingGrams: number;
  adjustedGrams: string;
};

function scaleNutrition(base: MealFormValues, baseGrams: number, newGrams: number): MealFormValues {
  const r = newGrams / baseGrams;
  const sc = (v: number) => Math.round(v * r * 10) / 10;
  return {
    name:         base.name,
    category:     base.category,
    calories:     sc(base.calories),
    protein:      sc(base.protein),
    carbs:        sc(base.carbs),
    fat:          sc(base.fat),
    satFat:       sc(base.satFat),
    fibre:        sc(base.fibre),
    addedSugar:   sc(base.addedSugar),
    naturalSugar: sc(base.naturalSugar),
    salt:         sc(base.salt),
    alcohol:      sc(base.alcohol),
    omega3:       sc(base.omega3),
  };
}

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
  const [modelTier, setModelTier] = useState<AssistModelTier>("accurate");
  const [assistMessage, setAssistMessage] = useState<string | null>(null);
  const [scannerOpen, setScannerOpen] = useState(false);
  const [quickFillTipsOpen, setQuickFillTipsOpen] = useState(false);
  const [barcodeConfirm, setBarcodeConfirm] = useState<BarcodeConfirm | null>(null);

  useEffect(() => {
    setValues(initialValues ?? EMPTY_FORM_VALUES);
    setError(null);
    setSaved(false);
    setAssistMessage(null);
    setQuickFillTipsOpen(false);
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
    setAssistMessage(null);
    setScannerOpen(false);
    setQuickFillTipsOpen(false);
    setBarcodeConfirm(null);
  }

  function applyAutofill(data: MealFormValues, message: string) {
    const r1 = (v: number | undefined) => Math.round((v ?? 0) * 10) / 10;
    setValues({
      name:         data.name         ?? "",
      category:     data.category     ?? null,
      calories:     r1(data.calories),
      protein:      r1(data.protein),
      carbs:        r1(data.carbs),
      fat:          r1(data.fat),
      satFat:       r1(data.satFat),
      fibre:        r1(data.fibre),
      addedSugar:   r1(data.addedSugar),
      naturalSugar: r1(data.naturalSugar),
      salt:         r1(data.salt),
      alcohol:      r1(data.alcohol),
      omega3:       r1(data.omega3),
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
      const rounded = isNaN(num) ? 0 : Math.round(num * 10) / 10;
      setValues((prev) => ({ ...prev, [key]: rounded }));
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

  async function handleBarcodeConfirmFlow(rawBarcode: string) {
    const barcode = normalizeBarcodeValue(rawBarcode);
    if (!/^\d{8,14}$/.test(barcode)) {
      setError("Enter a valid barcode number (8–14 digits). For other foods, use Assistant mode.");
      return;
    }
    setAiLoading(true);
    setError(null);
    setAssistMessage(null);
    try {
      const data = await requestAutofill({ mode: "barcode", barcode, modelTier }) as MealFormValues & { servingGrams?: number };
      const servingGrams = data.servingGrams ?? 100;
      setBarcodeConfirm({
        productName: data.name,
        baseData: data,
        servingGrams,
        adjustedGrams: String(servingGrams),
      });
      setProductLookup("");
      setScannerOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not find nutrition for that barcode.");
    } finally {
      setAiLoading(false);
    }
  }

  function handleScannerDetected(barcode: string) {
    setScannerOpen(false);
    void handleBarcodeConfirmFlow(barcode);
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
            <div className="quick-fill">
              <div className="quick-fill__header">
                <div className="quick-fill__header-main">
                  <span className="quick-fill__sparkle" aria-hidden="true">✨</span>
                  <div>
                    <span className="quick-fill__eyebrow">Quick fill</span>
                    <p className="quick-fill__summary">Look up a product first, or describe the meal for assisted fill.</p>
                  </div>
                </div>
              </div>

              <div className="quick-fill__sections">
                <section className="quick-fill__section">
                  <div className="quick-fill__section-top">
                    <div className="quick-fill__title-wrap">
                      <span className="quick-fill__icon" aria-hidden="true">🏷️</span>
                      <span className="quick-fill__title">Product lookup</span>
                    </div>
                    <span className="quick-fill__meta">Scan or type number</span>
                  </div>

                  <div className="quick-fill__row quick-fill__row--lookup">
                    <input
                      type="text"
                      className="quick-fill__input"
                      placeholder="Paste barcode number"
                      value={productLookup}
                      onChange={(e) => setProductLookup(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          void handleBarcodeConfirmFlow(productLookup.trim());
                        }
                      }}
                      disabled={aiLoading}
                    />
                    <button
                      type="button"
                      onClick={() => void handleBarcodeConfirmFlow(productLookup.trim())}
                      disabled={aiLoading || !productLookup.trim()}
                      className="btn-tonal btn-sm quick-fill__action"
                    >
                      {aiLoading ? "Looking…" : "Find"}
                    </button>
                    <button
                      type="button"
                      onClick={() => { setBarcodeConfirm(null); setScannerOpen((open) => !open); }}
                      disabled={aiLoading}
                      className="btn-ghost btn-sm quick-fill__action"
                    >
                      {scannerOpen ? "Hide scanner" : "📷 Scan"}
                    </button>
                  </div>

                  {scannerOpen && (
                    <div className="quick-fill__scanner">
                      <BarcodeScanner
                        onDetected={handleScannerDetected}
                        onClose={() => setScannerOpen(false)}
                      />
                    </div>
                  )}

                  {barcodeConfirm && (
                    <div style={{ marginTop: "var(--space-3)", padding: "var(--space-3)", borderRadius: "var(--radius-md)", background: "rgba(104,185,132,0.08)", border: "1px solid rgba(104,185,132,0.25)" }}>
                      <p style={{ fontSize: "0.875rem", fontWeight: 700, marginBottom: "var(--space-2)", color: "var(--md-on-surface)" }}>
                        📦 {barcodeConfirm.productName}
                      </p>
                      <p style={{ fontSize: "0.8125rem", color: "var(--md-on-surface-variant)", marginBottom: "var(--space-3)" }}>
                        Nutrition data is for <strong>{barcodeConfirm.servingGrams}g</strong>. Adjust to the amount you ate:
                      </p>
                      <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2)", marginBottom: "var(--space-3)" }}>
                        <input
                          type="number"
                          min={1}
                          step="1"
                          className="quick-fill__input quick-fill__input--amount"
                          value={barcodeConfirm.adjustedGrams}
                          onChange={(e) => setBarcodeConfirm((prev) => prev ? { ...prev, adjustedGrams: e.target.value } : null)}
                        />
                        <span style={{ fontSize: "0.875rem", color: "var(--md-on-surface-variant)" }}>g</span>
                      </div>
                      {(() => {
                        const g = parseFloat(barcodeConfirm.adjustedGrams);
                        const scaled = Number.isFinite(g) && g > 0
                          ? scaleNutrition(barcodeConfirm.baseData, barcodeConfirm.servingGrams, g)
                          : null;
                        return scaled ? (
                          <div style={{ display: "flex", gap: "var(--space-4)", flexWrap: "wrap", marginBottom: "var(--space-3)", fontSize: "0.8125rem", color: "var(--md-on-surface-variant)" }}>
                            <span><strong style={{ color: "var(--md-on-surface)" }}>{Math.round(scaled.calories)}</strong> kcal</span>
                            <span><strong style={{ color: "var(--md-on-surface)" }}>{scaled.protein}g</strong> protein</span>
                            <span><strong style={{ color: "var(--md-on-surface)" }}>{scaled.carbs}g</strong> carbs</span>
                            <span><strong style={{ color: "var(--md-on-surface)" }}>{scaled.fat}g</strong> fat</span>
                          </div>
                        ) : null;
                      })()}
                      <div style={{ display: "flex", gap: "var(--space-2)" }}>
                        <button
                          type="button"
                          className="btn-ghost btn-sm"
                          onClick={() => setBarcodeConfirm(null)}
                        >
                          ✕ Cancel
                        </button>
                        <button
                          type="button"
                          className="btn-primary btn-sm"
                          onClick={() => {
                            const g = parseFloat(barcodeConfirm.adjustedGrams);
                            if (!Number.isFinite(g) || g <= 0) { setError("Grams must be a positive number."); return; }
                            applyAutofill(scaleNutrition(barcodeConfirm.baseData, barcodeConfirm.servingGrams, g), `Filled from barcode — ${g}g`);
                            setBarcodeConfirm(null);
                          }}
                        >
                          ✓ Confirm
                        </button>
                      </div>
                    </div>
                  )}
                </section>

                <section className="quick-fill__section">
                  <div className="quick-fill__section-top quick-fill__section-top--assistant">
                    <div className="quick-fill__title-wrap">
                      <span className="quick-fill__icon" aria-hidden="true">🪄</span>
                      <span className="quick-fill__title">Assistant mode</span>
                    </div>

                    <div className="quick-fill__mode">
                      <label className="quick-fill__mode-label" htmlFor="meal-model-tier">Mode</label>
                      <select
                        id="meal-model-tier"
                        className="quick-fill__select"
                        value={modelTier}
                        onChange={(e) => setModelTier(e.target.value as AssistModelTier)}
                        disabled={aiLoading}
                      >
                        <option value="accurate">Best accuracy · GPT-4o</option>
                        <option value="balanced">Lower cost · GPT-4o mini</option>
                      </select>
                    </div>
                  </div>

                  <div className="quick-fill__row quick-fill__row--assistant">
                    <input
                      type="text"
                      className="quick-fill__input quick-fill__input--description"
                      placeholder="e.g. chicken breast, rice, broccoli"
                      value={aiPrompt}
                      onChange={(e) => setAiPrompt(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          handleAiEstimate();
                        }
                      }}
                      disabled={aiLoading}
                    />
                    <button
                      type="button"
                      onClick={handleAiEstimate}
                      disabled={aiLoading || !aiPrompt.trim()}
                      className="btn-primary btn-sm quick-fill__action"
                    >
                      {aiLoading ? "Filling…" : "Fill form"}
                    </button>
                  </div>

                </section>
              </div>

              <div className="quick-fill__tips">
                <button
                  type="button"
                  className="quick-fill__tips-toggle"
                  onClick={() => setQuickFillTipsOpen((open) => !open)}
                  aria-expanded={quickFillTipsOpen}
                >
                  <span>{quickFillTipsOpen ? "Hide quick-fill tips" : "Show quick-fill tips"}</span>
                  <span className={quickFillTipsOpen ? "quick-fill__tips-caret quick-fill__tips-caret--open" : "quick-fill__tips-caret"} aria-hidden="true">
                    ▼
                  </span>
                </button>

                {quickFillTipsOpen && (
                  <div className="quick-fill__tips-panel">
                    <p className="quick-fill__hint">
                      Product lookup: scan a barcode or paste the number. After lookup you can adjust grams — macros scale automatically.
                    </p>
                    <p className="quick-fill__hint">
                      Assistant mode: include rough amounts for the best match. The app checks food data first, then fills any gaps with AI.
                    </p>
                  </div>
                )}
              </div>

              {assistMessage && (
                <div className="quick-fill__feedback">
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
