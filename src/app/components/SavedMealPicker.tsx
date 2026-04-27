"use client";

import { useEffect, useMemo, useState } from "react";
import { type MealFormValues, type SavedMeal } from "@/app/types";

type HistoryMeal = SavedMeal & {
  lastUsedDate: string;
  createdAt?: string;
};

type MealPick = MealFormValues & {
  id: string;
  source: "history" | "template";
  lastUsedDate?: string;
};

type Props = {
  savedMeals: SavedMeal[];
  onSelect:   (meal: MealFormValues) => void;
  onDelete:   (id: string) => void;
};

function toFormValues(meal: MealFormValues): MealFormValues {
  return {
    name: meal.name,
    category: meal.category,
    calories: meal.calories,
    protein: meal.protein,
    carbs: meal.carbs,
    fat: meal.fat,
    satFat: meal.satFat,
    fibre: meal.fibre,
    addedSugar: meal.addedSugar,
    naturalSugar: meal.naturalSugar,
    salt: meal.salt,
    alcohol: meal.alcohol,
    omega3: meal.omega3,
  };
}

function formatDate(iso: string) {
  return new Date(`${iso}T12:00:00`).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
  });
}

export function SavedMealPicker({ savedMeals, onSelect, onDelete }: Props) {
  const [query, setQuery] = useState("");
  const [historyMeals, setHistoryMeals] = useState<HistoryMeal[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [managing, setManaging] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    const timeout = window.setTimeout(async () => {
      setLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams({
          q: query.trim(),
          limit: query.trim() ? "20" : "12",
        });
        const res = await fetch(`/api/meals/history?${params}`, {
          signal: controller.signal,
        });
        if (!res.ok) throw new Error(`Could not search meals (${res.status})`);
        const data = await res.json() as { meals: HistoryMeal[] };
        setHistoryMeals(data.meals);
      } catch (err) {
        if (!controller.signal.aborted) {
          setError(err instanceof Error ? err.message : "Could not search meals.");
        }
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }, 250);

    return () => {
      window.clearTimeout(timeout);
      controller.abort();
    };
  }, [query]);

  const results = useMemo<MealPick[]>(() => {
    const normalized = new Set<string>();
    const picks: MealPick[] = [];

    for (const meal of historyMeals) {
      const key = meal.name.trim().toLowerCase();
      normalized.add(key);
      picks.push({ ...toFormValues(meal), id: meal.id, source: "history", lastUsedDate: meal.lastUsedDate });
    }

    const templateMatches = savedMeals.filter((meal) => {
      const q = query.trim().toLowerCase();
      if (!q) return true;
      return meal.name.toLowerCase().includes(q);
    });

    for (const meal of templateMatches) {
      const key = meal.name.trim().toLowerCase();
      if (normalized.has(key)) continue;
      picks.push({ ...toFormValues(meal), id: meal.id, source: "template" });
    }

    return picks.slice(0, 24);
  }, [historyMeals, query, savedMeals]);

  return (
    <div className="saved-meal-picker">
      <div className="saved-meal-picker__header">
        <div>
          <span className="saved-meal-picker__eyebrow">Reuse a meal</span>
          <p className="saved-meal-picker__summary">Search meals you logged before.</p>
        </div>
        {savedMeals.length > 0 && (
          <button
            type="button"
            className="btn-ghost btn-sm"
            onClick={() => setManaging((value) => !value)}
          >
            {managing ? "Done" : "Templates"}
          </button>
        )}
      </div>

      <input
        type="search"
        className="quick-fill__input"
        placeholder="Search past meals, e.g. pizza, pasta, chicken"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        autoComplete="off"
      />

      {error && <div className="alert-error">{error}</div>}

      <div className="saved-meal-picker__results">
        {loading && results.length === 0 ? (
          <div className="saved-meal-picker__empty">Searching...</div>
        ) : results.length === 0 ? (
          <div className="saved-meal-picker__empty">No matching past meals yet.</div>
        ) : (
          results.map((meal) => (
            <button
              key={`${meal.source}-${meal.id}`}
              type="button"
              className="saved-meal-picker__result"
              onClick={() => onSelect(toFormValues(meal))}
            >
              <span className="saved-meal-picker__result-main">
                <span className="saved-meal-picker__result-name">{meal.name}</span>
                <span className="saved-meal-picker__result-meta">
                  {Math.round(meal.calories)} kcal · P {Math.round(meal.protein)}g · C {Math.round(meal.carbs)}g · F {Math.round(meal.fat)}g
                </span>
              </span>
              <span className="saved-meal-picker__source">
                {meal.source === "history" && meal.lastUsedDate ? formatDate(meal.lastUsedDate) : "Template"}
              </span>
            </button>
          ))
        )}
      </div>

      {managing && savedMeals.length > 0 && (
        <div className="saved-meal-picker__manage">
          {savedMeals.map((meal) => (
            <div key={meal.id} className="saved-meal-picker__manage-row">
              <span>
                {meal.name}
                <span className="saved-meal-picker__manage-kcal">{Math.round(meal.calories)} kcal</span>
              </span>
              <button
                type="button"
                className="btn-danger-ghost btn-sm"
                onClick={() => onDelete(meal.id)}
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
