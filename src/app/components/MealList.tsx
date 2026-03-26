"use client";

import { type LocalMeal } from "@/app/types";
import { MealItem } from "@/app/components/MealItem";

type Props = {
  meals: LocalMeal[];
  onEdit: (meal: LocalMeal) => void;
  onDelete: (id: string) => void;
};

export function MealList({ meals, onEdit, onDelete }: Props) {
  if (meals.length === 0) {
    return (
      <div className="card" style={{ padding: "var(--space-12) var(--space-6)", textAlign: "center" }}>
        <div style={{ fontSize: "2.5rem", marginBottom: "var(--space-3)" }}>🥗</div>
        <p style={{ fontWeight: 600, marginBottom: "var(--space-1)" }}>No meals yet</p>
        <p style={{ fontSize: "0.9375rem", color: "var(--color-text-muted)" }}>
          Use the form above to log your first meal.
        </p>
      </div>
    );
  }

  return (
    <div className="card" style={{ overflow: "hidden" }}>
      <div className="card-header">
        <h2>Meals</h2>
        <span className="badge-pill">{meals.length}</span>
      </div>
      {meals.map((meal) => (
        <MealItem key={meal.id} meal={meal} onEdit={onEdit} onDelete={onDelete} />
      ))}
    </div>
  );
}
