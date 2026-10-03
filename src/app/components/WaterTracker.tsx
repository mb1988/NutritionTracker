"use client";

import { useEffect, useRef, useState } from "react";

const GLASS_ML = 250;
/** Quiet period after the last tap before the total is saved. */
const SAVE_DELAY_MS = 400;

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

/**
 * Tap a glass to fill up to it; tap the last filled glass to empty it.
 *
 * Taps update the display immediately and are saved together once tapping
 * pauses, so quick taps never wait on (or race) the network.
 */
export function WaterTracker({ waterMl, goalMl, onChange }: Props) {
  const [displayMl, setDisplayMl] = useState(waterMl);
  const [status, setStatus] = useState<"idle" | "saving" | "error">("idle");

  const pendingMl = useRef<number | null>(null);
  const timer = useRef<number | null>(null);
  const savedMl = useRef(waterMl);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  // Follow the server value unless the user has unsaved taps.
  useEffect(() => {
    savedMl.current = waterMl;
    if (pendingMl.current === null) setDisplayMl(waterMl);
  }, [waterMl]);

  async function flush() {
    if (timer.current !== null) {
      window.clearTimeout(timer.current);
      timer.current = null;
    }
    const next = pendingMl.current;
    if (next === null) return;

    setStatus("saving");
    try {
      await onChangeRef.current(next);
      // Only clear if no newer tap arrived while this save was in flight.
      if (pendingMl.current === next) {
        pendingMl.current = null;
        setStatus("idle");
      }
    } catch {
      if (pendingMl.current === next) {
        pendingMl.current = null;
        setDisplayMl(savedMl.current);
        setStatus("error");
      }
    }
  }

  // Leaving the day (or the page) mid-debounce still saves the last taps.
  useEffect(() => () => { void flush(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  function set(next: number) {
    const clamped = Math.max(0, Math.min(next, 20000));
    setDisplayMl(clamped);
    setStatus("idle");
    pendingMl.current = clamped;
    if (timer.current !== null) window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => { void flush(); }, SAVE_DELAY_MS);
  }

  const goalGlasses = Math.max(1, Math.round(goalMl / GLASS_ML));
  const filledGlasses = Math.floor(displayMl / GLASS_ML);
  const glassCount = Math.max(goalGlasses, filledGlasses);

  function handleGlass(index: number) {
    set(index + 1 === filledGlasses ? index * GLASS_ML : (index + 1) * GLASS_ML);
  }

  return (
    <div className="activity-tile">
      <div className="activity-tile__top">
        <span className="activity-tile__label">💧 Water</span>
        <span className="activity-tile__value" aria-live="polite">
          {formatLitres(displayMl)}<small> / {formatLitres(goalMl)} L</small>
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
          onClick={() => set(displayMl + GLASS_ML)}
          aria-label="Add a glass of water"
          title="Add 250 ml"
        >
          +
        </button>
      </div>
      {status === "error" && <span className="activity-tile__error">Not saved — try again</span>}
    </div>
  );
}
