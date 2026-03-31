/**
 * Per-meal nutrient health thresholds.
 *
 * Based on NHS / WHO daily reference intakes split across ≈3 meals:
 *   NHS daily RI  →  per-meal thresholds (green · orange · red)
 *   ─────────────────────────────────────────────────────────────
 *   Calories  2 000 kcal  →  ≤ 600 · ≤ 800 · > 800
 *   Protein   50 g (more is better)  →  ≥ 20 good · ≥ 10 ok
 *   Carbs     260 g       →  ≤ 85 · ≤ 120 · > 120
 *   Fat       70 g        →  ≤ 22 · ≤ 30 · > 30
 *   Sat fat   20 g        →  ≤ 5  · ≤ 7  · > 7
 *   Fibre     30 g (more is better)  →  ≥ 8 good
 *   Added sugar 30 g      →  ≤ 6  · ≤ 10 · > 10
 *   Nat. sugar ~90 g total →  ≤ 15 · ≤ 25 · > 25
 *   Salt      6 g         →  ≤ 1.5 · ≤ 2 · > 2
 *   Alcohol   14 u/week   →  0 good · ≤ 2 · > 2
 *   Omega-3   250 mg/day (more is better)  →  ≥ 80 good
 */

export type NutrientStatus = "good" | "warn" | "bad" | "neutral";

type ThresholdDef =
  | { direction: "lower-is-better"; green: number; orange: number }
  | { direction: "higher-is-better"; green: number; ok?: number };

const THRESHOLDS: Record<string, ThresholdDef> = {
  calories:     { direction: "lower-is-better", green: 600, orange: 800 },
  protein:      { direction: "higher-is-better", green: 20, ok: 10 },
  carbs:        { direction: "lower-is-better", green: 85, orange: 120 },
  fat:          { direction: "lower-is-better", green: 22, orange: 30 },
  satFat:       { direction: "lower-is-better", green: 5, orange: 7 },
  fibre:        { direction: "higher-is-better", green: 8, ok: 4 },
  addedSugar:   { direction: "lower-is-better", green: 6, orange: 10 },
  naturalSugar: { direction: "lower-is-better", green: 15, orange: 25 },
  salt:         { direction: "lower-is-better", green: 1.5, orange: 2 },
  alcohol:      { direction: "lower-is-better", green: 0, orange: 2 },
  omega3:       { direction: "higher-is-better", green: 80 },
};

export function getNutrientStatus(key: string, value: number): NutrientStatus {
  const t = THRESHOLDS[key];
  if (!t || value === 0) return "neutral";

  if (t.direction === "lower-is-better") {
    if (value <= t.green) return "good";
    if (value <= t.orange) return "warn";
    return "bad";
  }

  // higher-is-better
  if (value >= t.green) return "good";
  if (t.ok !== undefined && value >= t.ok) return "neutral";
  return "neutral";
}

