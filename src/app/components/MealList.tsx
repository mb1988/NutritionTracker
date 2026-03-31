"use client";

import { useState } from "react";
import { type LocalMeal } from "@/app/types";
import { MealItem } from "@/app/components/MealItem";

type Props = {
  meals: LocalMeal[];
  onEdit: (meal: LocalMeal) => void;
  onDelete: (id: string) => void;
};

export function MealList({ meals, onEdit, onDelete }: Props) {
  const [collapsed, setCollapsed] = useState(false);

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

  return (
    <div className="card" style={{ overflow: "hidden" }}>
      <div
        className="card-header"
        style={{ borderBottom: "none", background: "rgba(255,255,255,0.04)", cursor: "pointer", userSelect: "none" }}
        onClick={() => setCollapsed((c) => !c)}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2)" }}>
          <span style={{
            fontSize: "0.75rem",
            transition: "transform 0.2s ease",
            transform: collapsed ? "rotate(-90deg)" : "rotate(0deg)",
            display: "inline-block",
          }}>
            ▼
          </span>
          <h2 style={{ fontWeight: 800 }}>Meals logged</h2>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontSize: "0.875rem", color: "var(--macro-calories)", fontWeight: 800, fontVariantNumeric: "tabular-nums" }}>
            {Math.round(totalCalories)} kcal
          </span>
          <span className="badge-pill">{meals.length}</span>
        </div>
      </div>
      {!collapsed && meals.map((meal) => (
        <MealItem key={meal.id} meal={meal} onEdit={onEdit} onDelete={onDelete} />
      ))}
    </div>
  );
}
