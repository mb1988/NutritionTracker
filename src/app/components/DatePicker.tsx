"use client";

import { useState } from "react";

type Props = {
  date:        string;
  steps:       number;
  stepSource?: string | null;
  stepsSyncedAt?: string | null;
  stepSyncEnabled?: boolean;
  onChange:    (date: string) => void;
  onStepsSave: (steps: number) => void;
};

function formatDisplayDate(iso: string): string {
  const d = new Date(`${iso}T00:00:00`);
  return d.toLocaleDateString("en-US", {
    weekday: "long",
    month:   "long",
    day:     "numeric",
    year:    "numeric",
  });
}

/** Adds/subtracts days from an ISO date string (timezone-safe) */
function offsetDate(iso: string, delta: number): string {
  const d = new Date(`${iso}T00:00:00`);
  d.setDate(d.getDate() + delta);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function DatePicker({ date, steps, stepSource, stepsSyncedAt, stepSyncEnabled, onChange, onStepsSave }: Props) {
  const [draftSteps, setDraftSteps] = useState<string>(steps > 0 ? String(steps) : "");
  const [saved,      setSaved]      = useState(false);

  function handleDateChange(newDate: string) {
    setDraftSteps("");
    onChange(newDate);
  }

  const displaySteps = draftSteps !== "" ? draftSteps : steps > 0 ? String(steps) : "";

  function handleStepsSubmit() {
    const n = parseInt(draftSteps, 10);
    const val = isNaN(n) || n < 0 ? 0 : n;
    onStepsSave(val);
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
  }

  const today = (() => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`; })();
  const isToday = date === today;

  return (
    <div className="card date-picker" style={{ flexWrap: "wrap", gap: "var(--space-3)" }}>
      {/* Left: date info + arrow nav */}
      <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2)", flex: 1, minWidth: 200 }}>
        <button
          type="button"
          className="btn-ghost btn-sm"
          onClick={() => handleDateChange(offsetDate(date, -1))}
          title="Previous day"
          style={{ padding: "var(--space-1) var(--space-2)", fontSize: "1rem", flexShrink: 0 }}
        >
          ‹
        </button>

        <div className="date-picker__info" style={{ flex: 1, textAlign: "center" }}>
          <span className="date-picker__eyebrow">
            {isToday ? "Today" : "Viewing"}
          </span>
          <span className="date-picker__value">{formatDisplayDate(date)}</span>
        </div>

        <button
          type="button"
          className="btn-ghost btn-sm"
          onClick={() => handleDateChange(offsetDate(date, 1))}
          title="Next day"
          disabled={isToday}
          style={{ padding: "var(--space-1) var(--space-2)", fontSize: "1rem", flexShrink: 0 }}
        >
          ›
        </button>
      </div>

      {/* Steps */}
      <div style={{ display: "grid", gap: 4 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{ fontSize: "0.625rem", fontWeight: 800, color: "var(--md-on-surface-variant)", textTransform: "uppercase", letterSpacing: "0.08em", whiteSpace: "nowrap" }}>
            👟 Steps
          </span>
          <input
            type="number"
            min={0}
            max={100000}
            step={500}
            placeholder="0"
            value={displaySteps}
            onChange={(e) => setDraftSteps(e.target.value)}
            onBlur={handleStepsSubmit}
            onKeyDown={(e) => e.key === "Enter" && handleStepsSubmit()}
            style={{ width: 90, textAlign: "right" }}
            className="date-picker__input"
            aria-label="Daily steps"
          />
          {saved && (
            <span style={{ fontSize: "0.75rem", color: "var(--md-primary-container)", fontWeight: 700 }}>✓</span>
          )}
        </div>
        <StepSyncNote
          stepSource={stepSource}
          stepsSyncedAt={stepsSyncedAt}
          stepSyncEnabled={stepSyncEnabled}
          isToday={isToday}
        />
      </div>

      {/* Date input */}
      <input
        type="date"
        value={date}
        max={today}
        onChange={(e) => handleDateChange(e.target.value)}
        className="date-picker__input"
      />
    </div>
  );
}

function StepSyncNote({
  stepSource,
  stepsSyncedAt,
  stepSyncEnabled,
  isToday,
}: {
  stepSource?: string | null;
  stepsSyncedAt?: string | null;
  stepSyncEnabled?: boolean;
  isToday: boolean;
}) {
  const hasSyncedSteps = stepSource === "ios-shortcuts" || stepSource === "android-health-connect";
  const label = hasSyncedSteps
    ? `Auto-synced${stepsSyncedAt ? ` · ${formatShortDateTime(stepsSyncedAt)}` : ""}`
    : stepSyncEnabled && isToday
      ? "Auto-sync connected · manual edit overrides if needed"
      : null;

  if (!label) return null;

  return (
    <span style={{ fontSize: "0.6875rem", color: hasSyncedSteps ? "var(--md-primary)" : "var(--md-on-surface-variant)", fontWeight: 600 }}>
      {label}
    </span>
  );
}

function formatShortDateTime(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "just now";
  return date.toLocaleString("en-GB", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

