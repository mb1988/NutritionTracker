"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import { Line, LineChart, ResponsiveContainer, Tooltip, YAxis } from "recharts";
import { useWeightLog } from "@/app/hooks/useWeightLog";
import { formatShortDate } from "@/app/lib/dates";
import { weeklyWeightChange } from "@/lib/weightTrend";

type Unit = "kg" | "lb";

const UNIT_KEY = "nutrition_tracker_weight_unit";
const KG_PER_LB = 0.45359237;
/** How many recent weigh-ins the sparkline shows. */
const SPARKLINE_POINTS = 30;

function toDisplay(kg: number, unit: Unit): number {
  return Math.round((unit === "kg" ? kg : kg / KG_PER_LB) * 10) / 10;
}

function toKg(value: number, unit: Unit): number {
  return unit === "kg" ? value : value * KG_PER_LB;
}

type Props = {
  /** The date a new weigh-in is recorded against (the day being viewed). */
  date: string;
};

export function WeightPanel({ date }: Props) {
  const { entries, loaded, error, saveEntry, deleteEntry } = useWeightLog();
  const [unit, setUnit] = useState<Unit>("kg");
  const [draft, setDraft] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    try {
      if (localStorage.getItem(UNIT_KEY) === "lb") setUnit("lb");
    } catch {
      // Storage unavailable — default to kg.
    }
  }, []);

  function changeUnit(next: Unit) {
    setUnit(next);
    setDraft("");
    try {
      localStorage.setItem(UNIT_KEY, next);
    } catch {
      // Storage unavailable — the choice still applies for this visit.
    }
  }

  const entryForDate = entries.find((entry) => entry.date === date) ?? null;
  const latest = entries[0] ?? null;
  const change = weeklyWeightChange(entries);
  const chartData = useMemo(
    () => entries.slice(0, SPARKLINE_POINTS).reverse().map((entry) => ({
      date: entry.date,
      weight: toDisplay(entry.weightKg, unit),
    })),
    [entries, unit],
  );

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const value = parseFloat(draft);
    if (!Number.isFinite(value) || value <= 0) return;
    setSaving(true);
    try {
      await saveEntry(date, toKg(value, unit));
      setDraft("");
    } catch {
      // The hook exposes the error message.
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="card weight-panel">
      <div className="weight-panel__header">
        <div>
          <h2 className="weight-panel__title">⚖️ Weight</h2>
          <span className="weight-panel__subtitle">
            {latest
              ? <>Latest {toDisplay(latest.weightKg, unit)} {unit} · {formatShortDate(latest.date)}</>
              : loaded ? "No weigh-ins yet" : "Loading…"}
          </span>
        </div>
        <div className="segmented" role="group" aria-label="Weight unit">
          {(["kg", "lb"] as Unit[]).map((option) => (
            <button
              key={option}
              type="button"
              className={unit === option ? "segmented__option segmented__option--active" : "segmented__option"}
              onClick={() => changeUnit(option)}
              aria-pressed={unit === option}
            >
              {option}
            </button>
          ))}
        </div>
      </div>

      {change !== null && (
        <p className={`weight-panel__trend ${change < 0 ? "is-down" : change > 0 ? "is-up" : ""}`}>
          {change === 0 ? "→ No change" : `${change < 0 ? "↓" : "↑"} ${change > 0 ? "+" : "−"}${toDisplay(Math.abs(change), unit)} ${unit}`} this week
        </p>
      )}

      {chartData.length >= 2 && (
        <div className="weight-panel__chart" aria-hidden="true">
          <ResponsiveContainer width="100%" height={72}>
            <LineChart data={chartData} margin={{ top: 6, right: 4, bottom: 6, left: 4 }}>
              <YAxis hide domain={["dataMin - 0.5", "dataMax + 0.5"]} />
              <Tooltip
                cursor={false}
                content={({ active, payload }) => {
                  if (!active || !payload?.length) return null;
                  const point = payload[0].payload as { date: string; weight: number };
                  return (
                    <div className="chart-tooltip">
                      <p className="chart-tooltip__label">{formatShortDate(point.date)}</p>
                      <p className="chart-tooltip__value">{point.weight} {unit}</p>
                    </div>
                  );
                }}
              />
              <Line type="monotone" dataKey="weight" stroke="var(--md-primary-container)" strokeWidth={2} dot={false} isAnimationActive={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      <form className="weight-panel__form" onSubmit={handleSubmit}>
        <label htmlFor="weight-input" className="visually-hidden">Weight in {unit}</label>
        <input
          id="weight-input"
          type="number"
          inputMode="decimal"
          step="0.1"
          min={unit === "kg" ? 20 : 45}
          max={unit === "kg" ? 400 : 880}
          placeholder={entryForDate ? `${toDisplay(entryForDate.weightKg, unit)}` : `Weight in ${unit}`}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          className="weight-panel__input"
        />
        <button type="submit" className="btn-tonal btn-sm" disabled={saving || !draft}>
          {saving ? "Saving…" : entryForDate ? "Update" : "Log"}
        </button>
        {entryForDate && (
          <button type="button" className="btn-ghost btn-sm" onClick={() => void deleteEntry(date)}>
            Remove
          </button>
        )}
      </form>
      {entryForDate && (
        <span className="weight-panel__note">
          Logged {toDisplay(entryForDate.weightKg, unit)} {unit} for {formatShortDate(date)}
        </span>
      )}
      {error && <div className="alert-error"><span>⚠️</span><span>{error}</span></div>}
    </div>
  );
}
