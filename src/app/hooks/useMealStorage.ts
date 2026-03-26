"use client";

import { useState, useEffect, useCallback } from "react";
import { type LocalMeal, type MealFormValues, type DaySnapshot, LS_KEY } from "@/app/types";

// ── Storage helpers ───────────────────────────────────────────

function loadMeals(): LocalMeal[] {
  try {
    const raw = localStorage.getItem(LS_KEY);
    return raw ? (JSON.parse(raw) as LocalMeal[]) : [];
  } catch {
    return [];
  }
}

function saveMeals(meals: LocalMeal[]) {
  localStorage.setItem(LS_KEY, JSON.stringify(meals));
}

function computeTotals(meals: LocalMeal[]): DaySnapshot {
  return meals.reduce(
    (acc, m) => ({
      calories:     acc.calories     + m.calories,
      protein:      acc.protein      + m.protein,
      carbs:        acc.carbs        + m.carbs,
      fat:          acc.fat          + m.fat,
      satFat:       acc.satFat       + m.satFat,
      fibre:        acc.fibre        + m.fibre,
      addedSugar:   acc.addedSugar   + m.addedSugar,
      naturalSugar: acc.naturalSugar + m.naturalSugar,
      salt:         acc.salt         + m.salt,
      alcohol:      acc.alcohol      + m.alcohol,
      omega3:       acc.omega3       + m.omega3,
    }),
    { calories: 0, protein: 0, carbs: 0, fat: 0, satFat: 0, fibre: 0, addedSugar: 0, naturalSugar: 0, salt: 0, alcohol: 0, omega3: 0 },
  );
}

// ── Hook ──────────────────────────────────────────────────────

export type UseMealStorage = {
  allMeals:    LocalMeal[];
  mealsForDay: LocalMeal[];
  totals:      DaySnapshot;
  hydrated:    boolean;
  addMeal:     (date: string, values: MealFormValues) => void;
  updateMeal:  (id: string, values: MealFormValues) => void;
  deleteMeal:  (id: string) => void;
};

export function useMealStorage(selectedDate: string): UseMealStorage {
  const [allMeals, setAllMeals] = useState<LocalMeal[]>([]);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setAllMeals(loadMeals());
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (hydrated) saveMeals(allMeals);
  }, [allMeals, hydrated]);

  const mealsForDay = allMeals.filter((m) => m.date === selectedDate);
  const totals = computeTotals(mealsForDay);

  const addMeal = useCallback((date: string, values: MealFormValues) => {
    setAllMeals((prev) => [...prev, { id: crypto.randomUUID(), date, ...values }]);
  }, []);

  const updateMeal = useCallback((id: string, values: MealFormValues) => {
    setAllMeals((prev) => prev.map((m) => (m.id === id ? { ...m, ...values } : m)));
  }, []);

  const deleteMeal = useCallback((id: string) => {
    setAllMeals((prev) => prev.filter((m) => m.id !== id));
  }, []);

  return { allMeals, mealsForDay, totals, hydrated, addMeal, updateMeal, deleteMeal };
}

