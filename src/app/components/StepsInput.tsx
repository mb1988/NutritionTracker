"use client";

import { useEffect, useState } from "react";

type Props = {
  steps: number;
  stepSource?: string | null;
  stepsSyncedAt?: string | null;
  onSave: (steps: number) => Promise<void>;
};

function formatSyncNote(stepSource?: string | null, stepsSyncedAt?: string | null): string | null {
  const provider = stepSource === "ios-shortcuts" ? "iPhone" : stepSource === "android-health-connect" ? "Android" : null;
  if (!provider) return null;

  const syncedAt = stepsSyncedAt ? new Date(stepsSyncedAt) : null;
  if (!syncedAt || Number.isNaN(syncedAt.getTime())) return `Synced from ${provider}`;

  return `Synced from ${provider} · ${syncedAt.toLocaleString("en-GB", {
    day: "numeric", month: "short", hour: "2-digit", minute: "2-digit",
  })}`;
}

export function StepsInput({ steps, stepSource, stepsSyncedAt, onSave }: Props) {
  const [draft, setDraft] = useState<string | null>(null);
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");

  // A different day (or a sync) changed the value underneath us.
  useEffect(() => {
    setDraft(null);
  }, [steps]);

  useEffect(() => {
    if (status !== "saved") return;
    const timer = window.setTimeout(() => setStatus("idle"), 1500);
    return () => window.clearTimeout(timer);
  }, [status]);

  async function commit() {
    if (draft === null) return;
    const parsed = parseInt(draft, 10);
    const next = Number.isNaN(parsed) || parsed < 0 ? 0 : Math.min(parsed, 100000);
    if (next === steps) {
      setDraft(null);
      return;
    }
    setStatus("saving");
    try {
      await onSave(next);
      setStatus("saved");
    } catch {
      setStatus("error");
    }
  }

  const syncNote = formatSyncNote(stepSource, stepsSyncedAt);

  return (
    <div className="activity-tile">
      <div className="activity-tile__top">
        <label className="activity-tile__label" htmlFor="daily-steps">👟 Steps</label>
        {status === "saved" && <span className="activity-tile__status">✓ Saved</span>}
        {status === "error" && <span className="activity-tile__error">Not saved</span>}
      </div>
      <input
        id="daily-steps"
        className="activity-tile__input"
        type="number"
        inputMode="numeric"
        min={0}
        max={100000}
        step={500}
        placeholder="0"
        value={draft ?? (steps > 0 ? String(steps) : "")}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={() => void commit()}
        onKeyDown={(e) => { if (e.key === "Enter") e.currentTarget.blur(); }}
        disabled={status === "saving"}
      />
      {syncNote && <span className="activity-tile__note">{syncNote}</span>}
    </div>
  );
}
