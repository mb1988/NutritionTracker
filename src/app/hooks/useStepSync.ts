"use client";

import { useCallback, useEffect, useState } from "react";
import { type StepSyncConfig, type StepSyncProvider } from "@/server/contracts/stepSync";

type StepSyncResponse = {
  config: StepSyncConfig;
};

type RegenerateStepSyncResponse = {
  config: StepSyncConfig;
  token: string;
};

export type UseStepSync = {
  config: StepSyncConfig | null;
  loading: boolean;
  actionLoading: boolean;
  error: string | null;
  latestToken: string | null;
  refresh: () => Promise<void>;
  regenerate: (provider: StepSyncProvider) => Promise<void>;
  disable: () => Promise<void>;
  clearLatestToken: () => void;
};

const JSON_HEADERS = { "Content-Type": "application/json" };

async function parseJson<T>(res: Response): Promise<T> {
  const body = await res.json().catch(() => null);
  if (!res.ok) {
    throw new Error(body?.error ?? `Request failed (${res.status})`);
  }
  return body as T;
}

export function useStepSync(enabled: boolean): UseStepSync {
  const [config, setConfig] = useState<StepSyncConfig | null>(null);
  const [loading, setLoading] = useState(enabled);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [latestToken, setLatestToken] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!enabled) {
      setConfig(null);
      setLoading(false);
      setError(null);
      setLatestToken(null);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const data = await parseJson<StepSyncResponse>(await fetch("/api/step-sync", { headers: JSON_HEADERS }));
      setConfig(data.config);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load step sync status.");
    } finally {
      setLoading(false);
    }
  }, [enabled]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const regenerate = useCallback(async (provider: StepSyncProvider) => {
    setActionLoading(true);
    setError(null);
    try {
      const data = await parseJson<RegenerateStepSyncResponse>(await fetch("/api/step-sync", {
        method: "POST",
        headers: JSON_HEADERS,
        body: JSON.stringify({ provider }),
      }));
      setConfig(data.config);
      setLatestToken(data.token);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not enable phone step sync.");
    } finally {
      setActionLoading(false);
    }
  }, []);

  const disable = useCallback(async () => {
    setActionLoading(true);
    setError(null);
    try {
      const data = await parseJson<StepSyncResponse>(await fetch("/api/step-sync", {
        method: "DELETE",
        headers: JSON_HEADERS,
      }));
      setConfig(data.config);
      setLatestToken(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not disable phone step sync.");
    } finally {
      setActionLoading(false);
    }
  }, []);

  return {
    config,
    loading,
    actionLoading,
    error,
    latestToken,
    refresh,
    regenerate,
    disable,
    clearLatestToken: () => setLatestToken(null),
  };
}

