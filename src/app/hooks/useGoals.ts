"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { type DailyGoals, DEFAULT_GOALS, LS_GOALS_KEY } from "@/app/types";

function readCachedGoals(): DailyGoals | null {
  try {
    const raw = localStorage.getItem(LS_GOALS_KEY);
    return raw ? { ...DEFAULT_GOALS, ...(JSON.parse(raw) as Partial<DailyGoals>) } : null;
  } catch {
    return null;
  }
}

function writeCachedGoals(goals: DailyGoals) {
  try {
    localStorage.setItem(LS_GOALS_KEY, JSON.stringify(goals));
  } catch {
    // Storage unavailable (private mode, quota) — the cache is optional.
  }
}

export function useGoals() {
  const { status } = useSession();
  const [goals, setGoals] = useState<DailyGoals>(DEFAULT_GOALS);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    if (status === "loading") return; // wait for session to resolve

    // Apply localStorage immediately as a fast initial value / offline cache
    const cached = readCachedGoals();
    if (cached) setGoals(cached);

    if (status === "unauthenticated") {
      // Demo mode: localStorage only
      setHydrated(true);
      return;
    }

    // Real authenticated user: fetch authoritative value from server
    let cancelled = false;
    fetch("/api/user/goals")
      .then((res) => {
        if (!res.ok) throw new Error(`Goals request failed (${res.status})`);
        return res.json() as Promise<Partial<DailyGoals>>;
      })
      .then((serverGoals) => {
        if (cancelled) return;
        const merged = { ...DEFAULT_GOALS, ...serverGoals };
        setGoals(merged);
        writeCachedGoals(merged);
      })
      .catch(() => {
        // Server unavailable; the localStorage value already applied above
      })
      .finally(() => {
        if (!cancelled) setHydrated(true);
      });

    return () => { cancelled = true; };
  }, [status]);

  /** Saves goals; rejects when the server refuses them so the UI can say so. */
  const updateGoals = useCallback(async (newGoals: DailyGoals) => {
    setGoals(newGoals);
    writeCachedGoals(newGoals);

    if (status !== "authenticated") return;

    const res = await fetch("/api/user/goals", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(newGoals),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => null);
      throw new Error(typeof body?.error === "string" ? body.error : "Could not save goals");
    }
  }, [status]);

  return { goals, updateGoals, hydrated };
}
