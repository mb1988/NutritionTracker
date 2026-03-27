"use client";

import { useState, useEffect, useCallback } from "react";
import { type SavedMeal, type MealFormValues, LS_SAVED_MEALS_KEY } from "@/app/types";

async function apiFetch<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(url, options);
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`API error ${res.status}: ${text}`);
  }
  if (res.status === 204) return undefined as T;
  return res.json();
}

/** One-time migration: push any templates from localStorage into the DB */
async function migrateLocalStorage(): Promise<void> {
  try {
    const raw = localStorage.getItem(LS_SAVED_MEALS_KEY);
    if (!raw) return;
    const local = JSON.parse(raw) as SavedMeal[];
    if (!local.length) return;

    await Promise.all(
      local.map((m) => {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { id: _id, ...rest } = m;
        return apiFetch("/api/saved-meals", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(rest),
        }).catch(() => {/* ignore duplicates */});
      }),
    );
    localStorage.removeItem(LS_SAVED_MEALS_KEY);
  } catch {
    // migration failure is non-fatal
  }
}

export function useSavedMeals() {
  const [savedMeals, setSavedMeals] = useState<SavedMeal[]>([]);
  const [hydrated,   setHydrated]   = useState(false);

  // Load from DB (+ migrate localStorage on first run)
  useEffect(() => {
    async function load() {
      await migrateLocalStorage();
      try {
        const data = await apiFetch<{ savedMeals: SavedMeal[] }>("/api/saved-meals");
        setSavedMeals(data.savedMeals);
      } catch {
        // fall back to empty list silently
      }
      setHydrated(true);
    }
    load();
  }, []);

  const saveMeal = useCallback(async (values: MealFormValues) => {
    const name = values.name.trim();
    if (!name) return;
    try {
      // Upsert: if name already exists locally, delete old then re-create
      const existing = savedMeals.find(
        (m) => m.name.toLowerCase() === name.toLowerCase(),
      );
      if (existing) {
        await apiFetch(`/api/saved-meals/${existing.id}`, { method: "DELETE" });
      }
      const data = await apiFetch<{ savedMeal: SavedMeal }>("/api/saved-meals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      setSavedMeals((prev) => {
        const without = prev.filter((m) => m.id !== existing?.id);
        return [data.savedMeal, ...without];
      });
    } catch (e) {
      console.error("Failed to save template:", e);
    }
  }, [savedMeals]);

  const deleteSavedMeal = useCallback(async (id: string) => {
    try {
      await apiFetch(`/api/saved-meals/${id}`, { method: "DELETE" });
      setSavedMeals((prev) => prev.filter((m) => m.id !== id));
    } catch (e) {
      console.error("Failed to delete template:", e);
    }
  }, []);

  return { savedMeals, saveMeal, deleteSavedMeal, hydrated };
}
