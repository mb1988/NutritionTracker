"use client";

import { useState } from "react";

const GLASS_ML = 250;

type Props = {
  waterMl: number;
  goalMl: number;
  onChange: (waterMl: number) => Promise<void>;
};

function GlassIcon({ filled }: { filled: boolean }) {
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
      <path
        d="M5 3h14l-1.6 16.2A2 2 0 0 1 15.4 21H8.6a2 2 0 0 1-2-1.8L5 3Z"
        fill={filled ? "var(--water)" : "none"}
        fillOpacity={filled ? 0.85 : 0}
        stroke={filled ? "var(--water)" : "var(--md-outline)"}
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      {filled && <path d="M6.4 8h11.2" stroke="rgba(255,255,255,0.35)" strokeWidth="1.2" />}
    </svg>
  );
}

function formatLitres(ml: number): string {
  return (ml / 1000).toLocaleString("en-GB", { maximumFractionDigits: 2 });
}

/** Tap a glass to fill up to it; tap the last filled glass to empty it. */
export function WaterTracker({ waterMl, goalMl, onChange }: Props) {
  const [error, setError] = useState<string | null>(null);
  const goalGlasses = Math.max(1, Math.round(goalMl / GLASS_ML));
  const filledGlasses = Math.floor(waterMl / GLASS_ML);
  const glassCount = Math.max(goalGlasses, filledGlasses);

  async function save(next: number) {
    setError(null);
    try {
      await onChange(Math.max(0, Math.min(next, 20000)));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save water");
    }
  }

  function handleGlass(index: number) {
    const target = (index + 1) * GLASS_ML;
    void save(index + 1 === filledGlasses ? index * GLASS_ML : target);
  }

  return (
    <div className="activity-tile">
      <div className="activity-tile__top">
        <span className="activity-tile__label">💧 Water</span>
        <span className="activity-tile__value">
          {formatLitres(waterMl)}<small> / {formatLitres(goalMl)} L</small>
        </span>
      </div>
      <div className="water-glasses" role="group" aria-label="Water glasses, 250 ml each">
        {Array.from({ length: glassCount }, (_, index) => (
          <button
            key={index}
            type="button"
            className="water-glass"
            onClick={() => handleGlass(index)}
            aria-label={`${index < filledGlasses ? "Empty to" : "Fill to"} glass ${index + 1}`}
            aria-pressed={index < filledGlasses}
          >
            <GlassIcon filled={index < filledGlasses} />
          </button>
        ))}
        <button
          type="button"
          className="water-glass water-glass--add"
          onClick={() => void save(waterMl + GLASS_ML)}
          aria-label="Add a glass of water"
          title="Add 250 ml"
        >
          +
        </button>
      </div>
      {error && <span className="activity-tile__error">{error}</span>}
    </div>
  );
}
