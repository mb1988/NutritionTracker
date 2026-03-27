"use client";

import { useState } from "react";
import { type SavedMeal } from "@/app/types";

type Props = {
  savedMeals: SavedMeal[];
  onSelect:   (meal: SavedMeal) => void;
  onDelete:   (id: string) => void;
};

export function SavedMealPicker({ savedMeals, onSelect, onDelete }: Props) {
  const [managing, setManaging] = useState(false);

  if (savedMeals.length === 0) return null;

  return (
    <div className="saved-meal-picker">
      {/* Row: dropdown + manage toggle */}
      <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2)" }}>
        <select
          defaultValue=""
          onChange={(e) => {
            const meal = savedMeals.find((m) => m.id === e.target.value);
            if (meal) { onSelect(meal); setManaging(false); }
            e.target.value = "";
          }}
          style={{
            flex: 1,
            background: "var(--md-surface-container-highest)",
            border: "none",
            borderRadius: "var(--radius-md)",
            padding: "var(--space-2) var(--space-3)",
            color: "var(--color-text)",
            fontSize: "0.875rem",
            cursor: "pointer",
          }}
        >
          <option value="" disabled>— load a template —</option>
          {savedMeals.map((m) => (
            <option key={m.id} value={m.id}>
              {m.name} ({Math.round(m.calories)} kcal)
            </option>
          ))}
        </select>

        <button
          type="button"
          onClick={() => setManaging((v) => !v)}
          title="Manage templates"
          style={{
            background: managing ? "var(--md-surface-bright)" : "transparent",
            color: managing ? "var(--md-error)" : "var(--md-on-surface-variant)",
            border: "none",
            borderRadius: "var(--radius-md)",
            padding: "var(--space-2) var(--space-3)",
            fontSize: "0.75rem",
            fontWeight: 700,
            cursor: "pointer",
            whiteSpace: "nowrap",
            transition: "background var(--transition), color var(--transition)",
          }}
        >
          {managing ? "Done" : "✎ Edit"}
        </button>
      </div>

      {/* Manage panel — only shown when toggled */}
      {managing && (
        <div style={{
          marginTop: "var(--space-3)",
          display: "flex",
          flexDirection: "column",
          gap: "var(--space-1)",
        }}>
          {savedMeals.map((m) => (
            <div
              key={m.id}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "var(--space-2) var(--space-3)",
                borderRadius: "var(--radius-md)",
                background: "var(--md-surface-container-highest)",
              }}
            >
              <span style={{ fontSize: "0.875rem", fontWeight: 600, color: "var(--color-text)" }}>
                {m.name}
                <span style={{ color: "var(--md-on-surface-variant)", fontWeight: 400, marginLeft: 6, fontSize: "0.75rem" }}>
                  {Math.round(m.calories)} kcal
                </span>
              </span>
              <button
                type="button"
                onClick={() => onDelete(m.id)}
                aria-label={`Delete ${m.name}`}
                style={{
                  background: "transparent",
                  border: "none",
                  color: "var(--md-error)",
                  cursor: "pointer",
                  padding: "2px 6px",
                  borderRadius: "var(--radius-sm)",
                  fontSize: "0.875rem",
                  fontWeight: 700,
                  transition: "background var(--transition)",
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(159,5,25,0.25)")}
                onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
              >
                Delete
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
