"use client";

import { useState } from "react";

type Props = {
  date:        string;
  steps:       number;
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

export function DatePicker({ date, steps, onChange, onStepsSave }: Props) {
  const [draftSteps, setDraftSteps] = useState<string>(steps > 0 ? String(steps) : "");
  const [saved,      setSaved]      = useState(false);

  // Keep draft in sync when the day changes
  function handleDateChange(newDate: string) {
    setDraftSteps("");   // will be refreshed from DB via parent
    onChange(newDate);
  }

  // Update draft when steps prop changes from outside (e.g. day load)
  // We only sync when there's no draft being edited
  const displaySteps = draftSteps !== "" ? draftSteps : steps > 0 ? String(steps) : "";

  function handleStepsSubmit() {
    const n = parseInt(draftSteps, 10);
    const val = isNaN(n) || n < 0 ? 0 : n;
    onStepsSave(val);
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
  }

  return (
    <div className="card date-picker" style={{ flexWrap: "wrap", gap: "var(--space-3)" }}>
      {/* Left: date info */}
      <div className="date-picker__info" style={{ flex: 1, minWidth: 160 }}>
        <span className="date-picker__eyebrow">Viewing</span>
        <span className="date-picker__value">{formatDisplayDate(date)}</span>
      </div>

      {/* Middle: steps */}
      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
        <span style={{ fontSize: "0.75rem", fontWeight: 700, color: "var(--md-on-surface-variant)", textTransform: "uppercase", letterSpacing: "0.06em", whiteSpace: "nowrap" }}>
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
          style={{ width: 90, textAlign: "right", padding: "var(--space-1) var(--space-2)" }}
          className="date-picker__input"
          aria-label="Daily steps"
        />
        {saved && (
          <span style={{ fontSize: "0.75rem", color: "var(--md-primary)", fontWeight: 600 }}>✓</span>
        )}
      </div>

      {/* Right: date input */}
      <input
        type="date"
        value={date}
        onChange={(e) => handleDateChange(e.target.value)}
        className="date-picker__input"
      />
    </div>
  );
}
