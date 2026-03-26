"use client";

import { useState, useEffect, useCallback } from "react";
import { type SavedMeal, type MealFormValues, LS_SAVED_MEALS_KEY } from "@/app/types";

function loadSaved(): SavedMeal[] {
  try {
    const raw = localStorage.getItem(LS_SAVED_MEALS_KEY);
    return raw ? (JSON.parse(raw) as SavedMeal[]) : [];
  } catch {
    return [];
  }
}

export function useSavedMeals() {
  const [savedMeals, setSavedMeals] = useState<SavedMeal[]>([]);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setSavedMeals(loadSaved());
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (hydrated) localStorage.setItem(LS_SAVED_MEALS_KEY, JSON.stringify(savedMeals));
  }, [savedMeals, hydrated]);

  const saveMeal = useCallback((values: MealFormValues) => {
    const name = values.name.trim();
    if (!name) return;
    setSavedMeals((prev) => {
      const existing = prev.find((m) => m.name.toLowerCase() === name.toLowerCase());
      if (existing) {
        // update in place
        return prev.map((m) => (m.id === existing.id ? { ...m, ...values } : m));
      }
      return [...prev, { id: crypto.randomUUID(), ...values }];
    });
  }, []);

  const deleteSavedMeal = useCallback((id: string) => {
    setSavedMeals((prev) => prev.filter((m) => m.id !== id));
  }, []);

  return { savedMeals, saveMeal, deleteSavedMeal, hydrated };
}

