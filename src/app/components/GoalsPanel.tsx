"use client";

import { useEffect, useRef, useState } from "react";
import { type DailyGoals, DEFAULT_GOALS, type NumericGoalKey } from "@/app/types";

type Props = {
  goals:  DailyGoals;
  /** False while the signed-in user's goals are still loading. */
  hydrated?: boolean;
  onSave: (goals: DailyGoals) => Promise<void> | void;
};

type GoalField = { key: NumericGoalKey; label: string; unit: string; step: number };

const GOAL_FIELDS: GoalField[] = [
  { key: "calories",     label: "Calories",      unit: "kcal", step: 50 },
  { key: "protein",      label: "Protein",       unit: "g",    step: 1 },
  { key: "carbs",        label: "Carbs",         unit: "g",    step: 1 },
  { key: "fat",          label: "Total Fat",     unit: "g",    step: 1 },
  { key: "satFat",       label: "Sat Fat",       unit: "g",    step: 1 },
  { key: "addedSugar",   label: "Added Sugar",   unit: "g",    step: 1 },
  { key: "naturalSugar", label: "Natural Sugar", unit: "g",    step: 1 },
  { key: "fibre",        label: "Fibre",         unit: "g",    step: 1 },
  { key: "salt",         label: "Salt",          unit: "g",    step: 0.5 },
  { key: "alcohol",      label: "Alcohol",       unit: "u",    step: 1 },
  { key: "omega3",       label: "Omega-3",       unit: "mg",   step: 50 },
  { key: "waterGoal",    label: "Water",         unit: "ml",   step: 250 },
];

export function GoalsPanel({ goals, hydrated = true, onSave }: Props) {
  const [open, setOpen]     = useState(false);
  const [draft, setDraft]   = useState<DailyGoals>(goals);
  const [saving, setSaving] = useState(false);
  const [error, setError]   = useState<string | null>(null);
  const firstInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (!open) return;
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("keydown", onKey);
    document.body.classList.add("no-scroll");
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.classList.remove("no-scroll");
    };
  }, [open]);

  useEffect(() => {
    if (open && hydrated) firstInputRef.current?.focus();
  }, [open, hydrated]);

  function handleOpen() {
    setDraft(goals);
    setError(null);
    setOpen(true);
  }

  // Goals that arrive from the server while the sheet is open replace the
  // defaults shown during loading.
  useEffect(() => {
    if (open && hydrated) setDraft(goals);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hydrated]);

  async function handleSave() {
    setSaving(true);
    setError(null);
    try {
      await onSave(draft);
      setOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save goals");
    } finally {
      setSaving(false);
    }
  }

  function setGoal(key: NumericGoalKey, raw: string) {
    const n = parseFloat(raw);
    setDraft((prev) => ({ ...prev, [key]: isNaN(n) || n < 0 ? 0 : n }));
  }

  return (
    <>
      <button
        type="button"
        className="btn-ghost btn-sm goals-panel__trigger"
        onClick={handleOpen}
        title="Edit daily goals"
      >
        ⚙️ Goals
      </button>

      {open && (
        <div className="sheet-backdrop" onClick={() => setOpen(false)}>
          <div
            className="goals-panel"
            role="dialog"
            aria-modal="true"
            aria-labelledby="goals-panel-title"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="goals-panel__header">
              <span className="goals-panel__title" id="goals-panel-title">Daily goals</span>
              <button type="button" className="btn-ghost btn-sm" onClick={() => setOpen(false)} aria-label="Close goals">✕</button>
            </div>

            {!hydrated ? (
              <div className="goals-panel__grid" aria-busy="true" aria-label="Loading goals">
                {GOAL_FIELDS.map(({ key }) => (
                  <div key={key} className="skeleton" style={{ height: 58, borderRadius: "var(--radius-sm)" }} />
                ))}
              </div>
            ) : (
              <div className="goals-panel__grid">
                {GOAL_FIELDS.map(({ key, label, unit, step }, index) => (
                  <div key={key} className="macro-input">
                    <label htmlFor={`goal-${key}`}>{label} ({unit})</label>
                    <input
                      ref={index === 0 ? firstInputRef : undefined}
                      id={`goal-${key}`}
                      type="number"
                      inputMode="decimal"
                      min={0}
                      step={step}
                      value={draft[key] === 0 ? "" : draft[key]}
                      placeholder="0"
                      onChange={(e) => setGoal(key, e.target.value)}
                      className="goals-panel__input"
                    />
                  </div>
                ))}
              </div>
            )}

            <label className="goals-panel__toggle">
              <input
                type="checkbox"
                checked={draft.stepCalorieAdjustment}
                onChange={(event) => setDraft((prev) => ({ ...prev, stepCalorieAdjustment: event.target.checked }))}
                disabled={!hydrated}
              />
              <span>
                <strong>Adjust calorie target from steps</strong>
                <small>About 40 kcal per 1,000 steps.</small>
              </span>
            </label>

            {error && <div className="alert-error" style={{ marginBottom: "var(--space-4)" }}><span>⚠️</span><span>{error}</span></div>}

            <div className="goals-panel__actions">
              <button type="button" className="btn-ghost btn-sm" onClick={() => setDraft(DEFAULT_GOALS)} disabled={!hydrated || saving}>
                Reset defaults
              </button>
              <button type="button" className="btn-primary btn-sm" onClick={() => void handleSave()} disabled={!hydrated || saving}>
                {saving ? "Saving…" : "Save goals"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
