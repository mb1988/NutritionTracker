"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { type MealFormValues } from "@/app/types";

// ── Shared types ──────────────────────────────────────────────

export type ApiMeal = {
  id: string;
  name: string;
  category: string | null;
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

/** Day totals without the meals — what the all-days endpoint returns. */
export type ApiDaySummary = {
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
  stepsSource?: string | null;
  stepsSyncedAt?: string | null;
  totalAlcohol: number;
  totalOmega3: number;
  totalWaterMl: number;
  mealCount: number;
};

/** A single day with its meals. */
export type ApiDay = Omit<ApiDaySummary, "mealCount"> & {
  meals: ApiMeal[];
};

// ── Fetch helpers ─────────────────────────────────────────────

// Session cookie is sent automatically — no need for x-user-id header
const HEADERS = { "Content-Type": "application/json" };

async function requestOk(input: RequestInfo | URL, init?: RequestInit) {
  const res = await fetch(input, init);
  if (!res.ok) {
    let message = `Request failed with status ${res.status}`;
    try {
      const data = await res.json();
      if (typeof data?.error === "string") message = data.error;
    } catch {
      // Keep the status-based fallback.
    }
    throw new Error(message);
  }
  return res;
}

async function fetchDay(date: string): Promise<ApiDay | null> {
  const res = await requestOk(`/api/days?date=${date}`, { headers: HEADERS });
  const data = await res.json();
  return data.day ?? null;
}

async function fetchDaySummaries(): Promise<ApiDaySummary[]> {
  const res = await requestOk("/api/days", { headers: HEADERS });
  const data = await res.json();
  return data.days ?? [];
}

function toSummary({ meals, ...day }: ApiDay): ApiDaySummary {
  return { ...day, mealCount: meals.length };
}

function isLogged(day: ApiDaySummary) {
  return day.mealCount > 0 || day.totalSteps > 0 || day.totalWaterMl > 0;
}

/** Inserts, replaces or drops one day in the newest-first summaries list. */
function upsertSummary(days: ApiDaySummary[], date: string, day: ApiDay | null): ApiDaySummary[] {
  const without = days.filter((d) => d.date !== date);
  const summary = day ? toSummary(day) : null;
  if (!summary || !isLogged(summary)) return without;
  return [...without, summary].sort((a, b) => b.date.localeCompare(a.date));
}

// ── Hook ──────────────────────────────────────────────────────

export type UseNutritionData = {
  /** The day being viewed (with meals), or null when nothing is logged for it. */
  selectedDay: ApiDay | null;
  /** Every logged day, newest first, without meals. */
  allDays: ApiDaySummary[];
  /** True until the first load finishes. */
  loading: boolean;
  /** True while switching to a different day. */
  dayLoading: boolean;
  /** Set when loading data failed. */
  error: string | null;
  addMeal: (date: string, values: MealFormValues) => Promise<void>;
  deleteMeal: (mealId: string, date: string) => Promise<void>;
  updateMeal: (mealId: string, values: MealFormValues, date: string) => Promise<void>;
  mergeMeals: (date: string, values: MealFormValues, mealIdsToDelete: string[]) => Promise<void>;
  updateSteps: (date: string, steps: number) => Promise<void>;
  updateWater: (date: string, waterMl: number) => Promise<void>;
  refreshDay: (date: string) => Promise<void>;
  refreshAll: () => Promise<void>;
};

export function useNutritionData(activeDate: string): UseNutritionData {
  const [selectedDay, setSelectedDay] = useState<ApiDay | null>(null);
  const [allDays, setAllDays] = useState<ApiDaySummary[]>([]);
  const [summariesLoaded, setSummariesLoaded] = useState(false);
  const [loadedDate, setLoadedDate] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Lets async callbacks know which day is on screen when they resolve.
  const activeDateRef = useRef(activeDate);
  activeDateRef.current = activeDate;

  // Summaries load once; mutations keep them current via refreshDay.
  useEffect(() => {
    let cancelled = false;
    fetchDaySummaries()
      .then((days) => { if (!cancelled) setAllDays(days); })
      .catch((err: Error) => { if (!cancelled) setError(err.message); })
      .finally(() => { if (!cancelled) setSummariesLoaded(true); });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    let cancelled = false;
    fetchDay(activeDate)
      .then((day) => { if (!cancelled) setSelectedDay(day); })
      .catch((err: Error) => {
        if (cancelled) return;
        setSelectedDay(null);
        setError(err.message);
      })
      .finally(() => { if (!cancelled) setLoadedDate(activeDate); });
    return () => { cancelled = true; };
  }, [activeDate]);

  const refreshDay = useCallback(async (date: string) => {
    const day = await fetchDay(date);
    if (date === activeDateRef.current) setSelectedDay(day);
    setAllDays((prev) => upsertSummary(prev, date, day));
  }, []);

  const refreshAll = useCallback(async () => {
    const [days, day] = await Promise.all([fetchDaySummaries(), fetchDay(activeDateRef.current)]);
    setAllDays(days);
    setSelectedDay(day);
    setError(null);
  }, []);

  const addMeal = useCallback(async (date: string, values: MealFormValues) => {
    await requestOk("/api/meals", {
      method: "POST",
      headers: HEADERS,
      body: JSON.stringify({ ...values, date }),
    });
    await refreshDay(date);
  }, [refreshDay]);

  const deleteMeal = useCallback(async (mealId: string, date: string) => {
    await requestOk(`/api/meals/${mealId}`, { method: "DELETE", headers: HEADERS });
    await refreshDay(date);
  }, [refreshDay]);

  const updateMeal = useCallback(async (mealId: string, values: MealFormValues, date: string) => {
    await requestOk(`/api/meals/${mealId}`, {
      method: "PATCH",
      headers: HEADERS,
      body: JSON.stringify(values),
    });
    await refreshDay(date);
  }, [refreshDay]);

  const mergeMeals = useCallback(async (date: string, values: MealFormValues, mealIdsToDelete: string[]) => {
    await requestOk("/api/meals", {
      method: "POST",
      headers: HEADERS,
      body: JSON.stringify({ ...values, date }),
    });

    try {
      for (const mealId of mealIdsToDelete) {
        await requestOk(`/api/meals/${mealId}`, { method: "DELETE", headers: HEADERS });
      }
    } finally {
      // Show whatever state the server ended up in, even after a partial failure.
      await refreshDay(date);
    }
  }, [refreshDay]);

  /**
   * PATCH /api/days returns the updated day with its meals, so the response
   * is applied directly instead of re-fetching the day.
   */
  const patchDay = useCallback(async (body: { date: string; steps?: number; waterMl?: number }) => {
    const res = await requestOk("/api/days", {
      method: "PATCH",
      headers: HEADERS,
      body: JSON.stringify(body),
    });
    const { day } = await res.json() as { day: ApiDay };
    if (body.date === activeDateRef.current) setSelectedDay(day);
    setAllDays((prev) => upsertSummary(prev, body.date, day));
  }, []);

  const updateSteps = useCallback(
    (date: string, steps: number) => patchDay({ date, steps }),
    [patchDay],
  );

  const updateWater = useCallback(
    (date: string, waterMl: number) => patchDay({ date, waterMl }),
    [patchDay],
  );

  return {
    selectedDay,
    allDays,
    loading: !summariesLoaded || loadedDate === null,
    dayLoading: loadedDate !== activeDate,
    error,
    addMeal,
    deleteMeal,
    updateMeal,
    mergeMeals,
    updateSteps,
    updateWater,
    refreshDay,
    refreshAll,
  };
}
