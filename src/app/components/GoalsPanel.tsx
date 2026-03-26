"use client";

import { useState } from "react";
import { type DailyGoals, DEFAULT_GOALS } from "@/app/types";

type Props = {
  goals:    DailyGoals;
  onSave:   (goals: DailyGoals) => void;
};

type GoalField = { key: keyof DailyGoals; label: string; unit: string };

const GOAL_FIELDS: GoalField[] = [
  { key: "calories", label: "Calories",     unit: "kcal" },
  { key: "protein",  label: "Protein",      unit: "g" },
  { key: "carbs",    label: "Carbs",        unit: "g" },
  { key: "fat",      label: "Fat",          unit: "g" },
  { key: "fibre",    label: "Fibre",        unit: "g" },
  { key: "salt",     label: "Salt",         unit: "g" },
];

export function GoalsPanel({ goals, onSave }: Props) {
  const [open, setOpen]     = useState(false);
  const [draft, setDraft]   = useState<DailyGoals>(goals);

  function handleOpen() {
    setDraft(goals); // reset to current on open
    setOpen(true);
  }

  function handleSave() {
    onSave(draft);
    setOpen(false);
  }

  function handleReset() {
    setDraft(DEFAULT_GOALS);
  }

  function setGoal(key: keyof DailyGoals, raw: string) {
    const n = parseFloat(raw);
    setDraft((prev) => ({ ...prev, [key]: isNaN(n) || n < 0 ? 0 : n }));
  }

  if (!open) {
    return (
      <button
        type="button"
        className="btn-ghost btn-sm goals-panel__trigger"
        onClick={handleOpen}
        title="Edit daily goals"
      >
        ⚙️ Goals
      </button>
    );
  }

  return (
    <div className="goals-panel">
      <div className="goals-panel__header">
        <span className="goals-panel__title">Daily Goals</span>
        <button type="button" className="btn-ghost btn-sm" onClick={() => setOpen(false)}>
          ✕
        </button>
      </div>
      <div className="goals-panel__grid">
        {GOAL_FIELDS.map(({ key, label, unit }) => (
          <div key={key} className="macro-input">
            <label htmlFor={`goal-${key}`}>
              {label} ({unit})
            </label>
            <input
              id={`goal-${key}`}
              type="number"
              min={0}
              step={key === "calories" ? 50 : 1}
              value={draft[key] === 0 ? "" : draft[key]}
              onChange={(e) => setGoal(key, e.target.value)}
            />
          </div>
        ))}
      </div>
      <div className="goals-panel__actions">
        <button type="button" className="btn-ghost btn-sm" onClick={handleReset}>
          Reset defaults
        </button>
        <button type="button" className="btn-primary btn-sm" onClick={handleSave}>
          Save goals
        </button>
      </div>
    </div>
  );
}

