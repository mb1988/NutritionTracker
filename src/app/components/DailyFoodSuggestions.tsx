"use client";

import { useEffect, useMemo, useState } from "react";
import { type DaySnapshot, type DailyGoals, type MealFormValues } from "@/app/types";
import { type FoodSuggestion, type FoodSuggestionResponse } from "@/server/contracts/foodSuggestions";

type Props = {
  selectedDate: string;
  goals: DailyGoals;
  totals: DaySnapshot;
  meals: MealFormValues[];
  savedMeals: MealFormValues[];
};

function localISODate(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function DailyFoodSuggestions({ selectedDate, goals, totals, meals, savedMeals }: Props) {
  const [suggestions, setSuggestions] = useState<FoodSuggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasRequested, setHasRequested] = useState(false);
  const isToday = selectedDate === localISODate();

  const requestBody = useMemo(() => JSON.stringify({
    date: selectedDate,
    goals,
    totals,
    meals,
    savedMeals,
  }), [selectedDate, goals, totals, meals, savedMeals]);

  useEffect(() => {
    if (!isToday) {
      setSuggestions([]);
      setError(null);
      setLoading(false);
      setHasRequested(false);
    }
  }, [isToday]);

  async function loadSuggestions() {
    setHasRequested(true);
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/food-suggestions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: requestBody,
      });

      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.error ?? `Request failed (${res.status})`);
      }

      const data = await res.json() as FoodSuggestionResponse;
      setSuggestions(data.suggestions);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load meal ideas right now.");
    } finally {
      setLoading(false);
    }
  }

  if (!isToday) {
    return null;
  }

  const alreadyAtOrOverCalories = totals.calories >= goals.calories;

  return (
    <div className="card-inset" style={{ padding: "var(--space-4)", marginBottom: "var(--space-5)" }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: "var(--space-3)", flexWrap: "wrap", marginBottom: "var(--space-3)" }}>
        <div>
          <div style={{ fontSize: "0.75rem", fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--md-primary)" }}>
            ✨ What else can I eat today?
          </div>
          <p style={{ marginTop: 6, fontSize: "0.8125rem", color: "var(--md-on-surface-variant)", lineHeight: 1.45 }}>
            {alreadyAtOrOverCalories
              ? "You are already at or over some caps, so these are lighter ideas that still help the day nutritionally."
              : "Based on today’s meals, your saved templates, and a few new ideas that should still fit your targets."}
          </p>
          {hasRequested && !loading && (
            <p style={{ marginTop: 6, fontSize: "0.75rem", color: "var(--md-on-surface-variant)", lineHeight: 1.45 }}>
              These ideas are based on the moment you asked. Refresh if you log more food or change goals.
            </p>
          )}
        </div>
        <button
          type="button"
          className="btn-ghost btn-sm"
          onClick={() => void loadSuggestions()}
          disabled={loading}
          style={{ alignSelf: "flex-start", whiteSpace: "nowrap" }}
        >
          {loading ? (hasRequested ? "Refreshing…" : "Getting ideas…") : (hasRequested ? "Refresh ideas" : "Get ideas")}
        </button>
      </div>

      {error && (
        <div className="alert-error" style={{ marginBottom: "var(--space-3)" }}>
          <span>⚠️</span>
          <span>{error}</span>
        </div>
      )}

      {!hasRequested && !loading ? (
        <div className="card-inset" style={{ padding: "var(--space-4)", background: "rgba(255,255,255,0.02)" }}>
          <p style={{ margin: 0, fontSize: "0.8125rem", color: "var(--md-on-surface-variant)", lineHeight: 1.5 }}>
            Tap <strong>Get ideas</strong> if you want food suggestions for the rest of today.
          </p>
        </div>
      ) : loading ? (
        <div style={{ display: "grid", gap: "var(--space-3)" }}>
          {[0, 1, 2].map((index) => (
            <div
              key={index}
              className="skeleton"
              style={{ height: 108, borderRadius: "var(--radius-lg)" }}
            />
          ))}
        </div>
      ) : (
        <div style={{ display: "grid", gap: "var(--space-3)" }}>
          {suggestions.map((suggestion) => (
            <SuggestionCard key={`${suggestion.source}-${suggestion.name}`} suggestion={suggestion} />
          ))}
        </div>
      )}
    </div>
  );
}

function SuggestionCard({ suggestion }: { suggestion: FoodSuggestion }) {
  return (
    <div className="card-inset" style={{ padding: "var(--space-4)", background: "rgba(255,255,255,0.02)" }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: "var(--space-3)", alignItems: "flex-start", flexWrap: "wrap" }}>
        <div style={{ flex: 1, minWidth: 200 }}>
          <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2)", flexWrap: "wrap", marginBottom: 6 }}>
            <h3 style={{ fontSize: "0.9375rem", fontWeight: 800, letterSpacing: "-0.02em" }}>{suggestion.name}</h3>
            <SourceBadge source={suggestion.source} />
          </div>
          <p style={{ fontSize: "0.8125rem", color: "var(--md-on-surface-variant)", lineHeight: 1.45 }}>
            {suggestion.reason}
          </p>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(72px, auto))", gap: "var(--space-2)", fontVariantNumeric: "tabular-nums" }}>
          <MetricPill label="kcal" value={suggestion.calories} />
          <MetricPill label="Protein" value={suggestion.protein} unit="g" />
          <MetricPill label="Carbs" value={suggestion.carbs} unit="g" />
          <MetricPill label="Fat" value={suggestion.fat} unit="g" />
          <MetricPill label="Fibre" value={suggestion.fibre} unit="g" />
          <MetricPill label="Ω-3" value={suggestion.omega3} unit="mg" integer />
        </div>
      </div>
    </div>
  );
}

function SourceBadge({ source }: { source: FoodSuggestion["source"] }) {
  const styleBySource: Record<FoodSuggestion["source"], { label: string; background: string; color: string }> = {
    logged: {
      label: "From today",
      background: "rgba(104, 185, 132, 0.12)",
      color: "var(--md-primary)",
    },
    template: {
      label: "Template",
      background: "rgba(129, 140, 248, 0.14)",
      color: "#b9c1ff",
    },
    new: {
      label: "New idea",
      background: "rgba(245, 158, 11, 0.14)",
      color: "#f7c673",
    },
  };

  const style = styleBySource[source];
  return (
    <span style={{
      display: "inline-flex",
      alignItems: "center",
      padding: "4px 10px",
      borderRadius: "var(--radius-full)",
      background: style.background,
      color: style.color,
      fontSize: "0.6875rem",
      fontWeight: 800,
      letterSpacing: "0.05em",
      textTransform: "uppercase",
    }}>
      {style.label}
    </span>
  );
}

function MetricPill({ label, value, unit = "", integer = false }: { label: string; value: number; unit?: string; integer?: boolean }) {
  const displayValue = integer ? Math.round(value) : Math.round(value * 10) / 10;
  return (
    <div style={{
      borderRadius: "var(--radius-md)",
      background: "rgba(255,255,255,0.04)",
      padding: "8px 10px",
      minWidth: 72,
    }}>
      <div style={{ fontSize: "0.625rem", fontWeight: 800, letterSpacing: "0.05em", textTransform: "uppercase", color: "var(--md-on-surface-variant)" }}>
        {label}
      </div>
      <div style={{ fontSize: "0.8125rem", fontWeight: 800, marginTop: 2 }}>
        {displayValue}{unit}
      </div>
    </div>
  );
}

