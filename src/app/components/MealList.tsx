"use client";

import { useState } from "react";
import { type LocalMeal, type MealFormValues } from "@/app/types";
import { MealItem } from "@/app/components/MealItem";

type Props = {
  meals: LocalMeal[];
  onEdit: (meal: LocalMeal) => void;
  onDelete: (id: string) => void;
  onMerge: (merged: MealFormValues, idsToDelete: string[]) => void;
};

const NUMERIC_KEYS: (keyof MealFormValues)[] = [
  "calories", "protein", "carbs", "fat", "satFat",
  "fibre", "addedSugar", "naturalSugar", "salt", "alcohol", "omega3",
];

function sumMeals(meals: LocalMeal[]): MealFormValues {
  const base: MealFormValues = {
    name: meals.map((m) => m.name).join(" + "),
    category: meals[0]?.category ?? null,
    calories: 0, protein: 0, carbs: 0, fat: 0, satFat: 0,
    fibre: 0, addedSugar: 0, naturalSugar: 0, salt: 0, alcohol: 0, omega3: 0,
  };
  for (const meal of meals) {
    for (const key of NUMERIC_KEYS) {
      (base[key] as number) += (meal[key] as number);
    }
  }
  // round to 1dp
  for (const key of NUMERIC_KEYS) {
    (base[key] as number) = Math.round((base[key] as number) * 10) / 10;
  }
  return base;
}

export function MealList({ meals, onEdit, onDelete, onMerge }: Props) {
  const [collapsed, setCollapsed] = useState(false);
  const [mergeMode, setMergeMode] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [mergeName, setMergeName] = useState("");
  const [confirming, setConfirming] = useState(false);

  if (meals.length === 0) {
    return (
      <div className="card" style={{ padding: "var(--space-12) var(--space-6)", textAlign: "center", background: "var(--md-surface-container)" }}>
        <div style={{ fontSize: "2.75rem", marginBottom: "var(--space-4)", filter: "grayscale(0.2)" }}>🥗</div>
        <p style={{ fontWeight: 800, fontSize: "0.9375rem", marginBottom: "var(--space-2)", letterSpacing: "-0.02em" }}>
          No meals logged yet
        </p>
        <p style={{ fontSize: "0.875rem", color: "var(--md-on-surface-variant)" }}>
          Use the form above to log your first meal.
        </p>
      </div>
    );
  }

  const totalCalories = meals.reduce((s, m) => s + m.calories, 0);
  const selectedMeals = meals.filter((m) => selected.has(m.id));

  function toggleSelect(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
    setConfirming(false);
  }

  function enterMergeMode() {
    setMergeMode(true);
    setSelected(new Set());
    setConfirming(false);
    setMergeName("");
  }

  function exitMergeMode() {
    setMergeMode(false);
    setSelected(new Set());
    setConfirming(false);
    setMergeName("");
  }

  function startConfirm() {
    const preview = sumMeals(selectedMeals);
    setMergeName(preview.name);
    setConfirming(true);
  }

  function commitMerge() {
    const merged = sumMeals(selectedMeals);
    merged.name = mergeName.trim() || merged.name;
    onMerge(merged, [...selected]);
    exitMergeMode();
  }

  const previewSum = selectedMeals.length >= 2 ? sumMeals(selectedMeals) : null;

  return (
    <div className="card" style={{ overflow: "hidden" }}>
      <div
        className="card-header"
        style={{ borderBottom: "none", background: "rgba(255,255,255,0.04)", cursor: mergeMode ? undefined : "pointer", userSelect: "none" }}
        onClick={mergeMode ? undefined : () => setCollapsed((c) => !c)}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2)" }}>
          {!mergeMode && (
            <span style={{
              fontSize: "0.75rem",
              transition: "transform 0.2s ease",
              transform: collapsed ? "rotate(-90deg)" : "rotate(0deg)",
              display: "inline-block",
            }}>
              ▼
            </span>
          )}
          <h2 style={{ fontWeight: 800 }}>{mergeMode ? "Select meals to merge" : "Meals logged"}</h2>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          {!mergeMode && meals.length >= 2 && (
            <button
              type="button"
              className="btn-ghost btn-sm"
              onClick={(e) => { e.stopPropagation(); enterMergeMode(); }}
              title="Merge meals"
              style={{ fontSize: "0.75rem" }}
            >
              ⊕ Merge
            </button>
          )}
          {!mergeMode && (
            <>
              <span style={{ fontSize: "0.875rem", color: "var(--macro-calories)", fontWeight: 800, fontVariantNumeric: "tabular-nums" }}>
                {Math.round(totalCalories)} kcal
              </span>
              <span className="badge-pill">{meals.length}</span>
            </>
          )}
          {mergeMode && (
            <button
              type="button"
              className="btn-ghost btn-sm"
              onClick={exitMergeMode}
            >
              ✕ Cancel
            </button>
          )}
        </div>
      </div>

      {mergeMode && (
        <div style={{ padding: "var(--space-3) var(--space-4)", borderBottom: "1px solid rgba(255,255,255,0.06)", fontSize: "0.8125rem", color: "var(--md-on-surface-variant)" }}>
          Tap meals to select them, then merge into one entry.
        </div>
      )}

      {!collapsed && meals.map((meal) => (
        <MealItem
          key={meal.id}
          meal={meal}
          onEdit={onEdit}
          onDelete={onDelete}
          mergeMode={mergeMode}
          selected={selected.has(meal.id)}
          onSelect={toggleSelect}
        />
      ))}

      {mergeMode && selected.size >= 2 && !confirming && (
        <div style={{ padding: "var(--space-3) var(--space-4)", borderTop: "1px solid rgba(255,255,255,0.06)", display: "flex", flexDirection: "column", gap: "var(--space-2)" }}>
          {previewSum && (
            <div style={{ fontSize: "0.8125rem", color: "var(--md-on-surface-variant)", display: "flex", flexWrap: "wrap", gap: "var(--space-3)" }}>
              <span><strong style={{ color: "var(--md-on-surface)" }}>{Math.round(previewSum.calories)}</strong> kcal</span>
              <span><strong style={{ color: "var(--md-on-surface)" }}>{previewSum.protein}g</strong> protein</span>
              <span><strong style={{ color: "var(--md-on-surface)" }}>{previewSum.carbs}g</strong> carbs</span>
              <span><strong style={{ color: "var(--md-on-surface)" }}>{previewSum.fat}g</strong> fat</span>
            </div>
          )}
          <button
            type="button"
            className="btn-primary btn-sm"
            onClick={startConfirm}
            style={{ alignSelf: "flex-start" }}
          >
            Merge {selected.size} meals →
          </button>
        </div>
      )}

      {mergeMode && confirming && (
        <div style={{ padding: "var(--space-3) var(--space-4)", borderTop: "1px solid rgba(255,255,255,0.06)", display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
          <p style={{ fontSize: "0.8125rem", color: "var(--md-on-surface-variant)" }}>
            Give the merged meal a name:
          </p>
          <input
            type="text"
            className="quick-fill__input"
            style={{ fontSize: "0.9375rem", fontWeight: 600 }}
            value={mergeName}
            onChange={(e) => setMergeName(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") commitMerge(); }}
            autoFocus
          />
          <div style={{ display: "flex", gap: "var(--space-2)" }}>
            <button type="button" className="btn-ghost btn-sm" onClick={() => setConfirming(false)}>← Back</button>
            <button
              type="button"
              className="btn-primary btn-sm"
              onClick={commitMerge}
              disabled={!mergeName.trim()}
            >
              ✓ Confirm merge
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
