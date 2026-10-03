"use client";

import { useCallback, useEffect, useState } from "react";
import { localISODate } from "@/app/lib/dates";
import { type WeightEntryDto } from "@/lib/weightTrend";

async function readError(res: Response): Promise<string> {
  const body = await res.json().catch(() => null);
  return typeof body?.error === "string" ? body.error : `Request failed (${res.status})`;
}

/** Recent weigh-ins (newest first) plus save/delete helpers. */
export function useWeightLog() {
  const [entries, setEntries] = useState<WeightEntryDto[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/weight?today=${localISODate()}`)
      .then(async (res) => {
        if (!res.ok) throw new Error(await readError(res));
        return res.json() as Promise<{ entries: WeightEntryDto[] }>;
      })
      .then((data) => { if (!cancelled) setEntries(data.entries); })
      .catch((err: Error) => { if (!cancelled) setError(err.message); })
      .finally(() => { if (!cancelled) setLoaded(true); });
    return () => { cancelled = true; };
  }, []);

  const saveEntry = useCallback(async (date: string, weightKg: number) => {
    setError(null);
    const res = await fetch("/api/weight", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ date, weightKg }),
    });
    if (!res.ok) {
      const message = await readError(res);
      setError(message);
      throw new Error(message);
    }
    const { entry } = await res.json() as { entry: WeightEntryDto };
    setEntries((prev) =>
      [...prev.filter((e) => e.date !== entry.date), entry].sort((a, b) => b.date.localeCompare(a.date)),
    );
  }, []);

  const deleteEntry = useCallback(async (date: string) => {
    setError(null);
    const res = await fetch(`/api/weight?date=${date}`, { method: "DELETE" });
    if (!res.ok) {
      setError(await readError(res));
      return;
    }
    setEntries((prev) => prev.filter((e) => e.date !== date));
  }, []);

  return { entries, loaded, error, saveEntry, deleteEntry };
}
