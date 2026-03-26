"use client";

import { useState, useEffect, useCallback } from "react";
import { type MealFormValues, USER_ID } from "@/app/types";

// ── Shared types ──────────────────────────────────────────────

export type ApiMeal = {
  id: string;
  name: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  satFat: number;
  fibre: number;
  addedSugar: number;
  naturalSugar: number;
  salt: number;
  alcohol: number;
  omega3: number;
  createdAt?: string;
};

export type ApiDay = {
  id: string;
  date: string;
  totalCalories: number;
  totalProtein: number;
  totalCarbs: number;
  totalFat: number;
  totalSatFat: number;
  totalFibre: number;
  totalAddedSugar: number;
  totalNaturalSugar: number;
  totalSalt: number;
  totalSteps: number;
  totalAlcohol: number;
  totalOmega3: number;
  meals: ApiMeal[];
};

// ── Fetch helpers ─────────────────────────────────────────────

const HEADERS = { "x-user-id": USER_ID, "Content-Type": "application/json" };

async function fetchDay(date: string): Promise<ApiDay | null> {
  const res = await fetch(`/api/days?date=${date}`, { headers: HEADERS });
  const data = await res.json();
  return data.day ?? null;
}

async function fetchAllDays(): Promise<ApiDay[]> {
  const res = await fetch("/api/days", { headers: HEADERS });
  const data = await res.json();
  return data.days ?? [];
}

// ── Hook ──────────────────────────────────────────────────────

export type UseNutritionData = {
  selectedDay: ApiDay | null;
  allDays: ApiDay[];
  loading: boolean;
  addMeal: (date: string, values: MealFormValues) => Promise<void>;
  deleteMeal: (mealId: string, date: string) => Promise<void>;
  updateMeal: (mealId: string, values: MealFormValues, date: string) => Promise<void>;
  refreshDay: (date: string) => Promise<void>;
  refreshAll: () => Promise<void>;
};

export function useNutritionData(selectedDate: string): UseNutritionData {
  const [selectedDay, setSelectedDay] = useState<ApiDay | null>(null);
  const [allDays, setAllDays] = useState<ApiDay[]>([]);
  const [loading, setLoading] = useState(true);

  // Load selected day + all days on mount or date change
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    Promise.all([fetchDay(selectedDate), fetchAllDays()])
      .then(([day, days]) => {
        if (!cancelled) {
          setSelectedDay(day);
          setAllDays(days);
          setLoading(false);
        }
      })
      .catch(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [selectedDate]);

  const refreshDay = useCallback(async (date: string) => {
    const day = await fetchDay(date);
    setSelectedDay(day);
    // Also update allDays in place
    setAllDays((prev) =>
      day
        ? prev.some((d) => d.date === date)
          ? prev.map((d) => (d.date === date ? day : d))
          : [day, ...prev].sort((a, b) => b.date.localeCompare(a.date))
        : prev,
    );
  }, []);

  const refreshAll = useCallback(async () => {
    const days = await fetchAllDays();
    setAllDays(days);
    const current = days.find((d) => d.date === selectedDate) ?? null;
    setSelectedDay(current);
  }, [selectedDate]);

  const addMeal = useCallback(async (date: string, values: MealFormValues) => {
    await fetch("/api/meals", {
      method: "POST",
      headers: HEADERS,
      body: JSON.stringify({ ...values, date }),
    });
    await refreshDay(date);
  }, [refreshDay]);

  const deleteMeal = useCallback(async (mealId: string, date: string) => {
    await fetch(`/api/meals/${mealId}`, { method: "DELETE", headers: HEADERS });
    await refreshDay(date);
  }, [refreshDay]);

  const updateMeal = useCallback(async (mealId: string, values: MealFormValues, date: string) => {
    await fetch(`/api/meals/${mealId}`, {
      method: "PATCH",
      headers: HEADERS,
      body: JSON.stringify(values),
    });
    await refreshDay(date);
  }, [refreshDay]);

  return { selectedDay, allDays, loading, addMeal, deleteMeal, updateMeal, refreshDay, refreshAll };
}

