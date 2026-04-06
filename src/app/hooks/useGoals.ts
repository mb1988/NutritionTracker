"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { type DailyGoals, DEFAULT_GOALS, LS_GOALS_KEY } from "@/app/types";

export function useGoals() {
  const { status } = useSession();
  const [goals, setGoals] = useState<DailyGoals>(DEFAULT_GOALS);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    if (status === "loading") return; // wait for session to resolve

    // Apply localStorage immediately as a fast initial value / offline cache
    try {
      const raw = localStorage.getItem(LS_GOALS_KEY);
      if (raw) {
        const saved = JSON.parse(raw) as Partial<DailyGoals>;
        setGoals({ ...DEFAULT_GOALS, ...saved });
      }
    } catch {
      // ignore
    }

    if (status === "unauthenticated") {
      // Demo mode: localStorage only
      setHydrated(true);
      return;
    }

    // Real authenticated user: fetch authoritative value from server
    let cancelled = false;
    fetch("/api/user/goals")
      .then((res) => res.json())
      .then((serverGoals: Partial<DailyGoals>) => {
        if (cancelled) return;
        const merged = { ...DEFAULT_GOALS, ...serverGoals };
        setGoals(merged);
        // Keep localStorage in sync with server truth
        localStorage.setItem(LS_GOALS_KEY, JSON.stringify(merged));
      })
      .catch(() => {
        // Server unavailable; the localStorage value already applied above
      })
      .finally(() => {
        if (!cancelled) setHydrated(true);
      });

    return () => { cancelled = true; };
  }, [status]);

  const updateGoals = useCallback(async (newGoals: DailyGoals) => {
    setGoals(newGoals);
    localStorage.setItem(LS_GOALS_KEY, JSON.stringify(newGoals));

    if (status === "authenticated") {
      try {
        await fetch("/api/user/goals", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(newGoals),
        });
      } catch {
        // Offline or error; localStorage already updated as cache
      }
    }
  }, [status]);

  return { goals, updateGoals, hydrated };
}

