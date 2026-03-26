"use client";

import { useState, useEffect, useCallback } from "react";
import { type DailyGoals, DEFAULT_GOALS, LS_GOALS_KEY } from "@/app/types";

export function useGoals() {
  const [goals, setGoals] = useState<DailyGoals>(DEFAULT_GOALS);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(LS_GOALS_KEY);
      if (raw) setGoals(JSON.parse(raw) as DailyGoals);
    } catch {
      // ignore
    }
    setHydrated(true);
  }, []);

  const updateGoals = useCallback((newGoals: DailyGoals) => {
    setGoals(newGoals);
    localStorage.setItem(LS_GOALS_KEY, JSON.stringify(newGoals));
  }, []);

  return { goals, updateGoals, hydrated };
}

