"use client";

import { useState } from "react";
import { type DailyGoals, type NutrientGoalKey } from "@/app/types";
import { type ApiDaySummary } from "@/app/hooks/useNutritionData";
import { formatShortDate } from "@/app/lib/dates";

/** History renders this many day cards at a time (the demo has a year of them). */
const PAGE_SIZE = 60;

const MINI_BARS: { goalKey: NutrientGoalKey; apiKey: keyof ApiDaySummary; label: string; reverse: boolean }[] = [
  { goalKey: "calories", apiKey: "totalCalories", label: "Calories", reverse: false },
  { goalKey: "protein",  apiKey: "totalProtein",  label: "Protein",  reverse: true },
  { goalKey: "carbs",    apiKey: "totalCarbs",    label: "Carbs",    reverse: false },
  { goalKey: "fat",      apiKey: "totalFat",      label: "Fat",      reverse: false },
  { goalKey: "satFat",   apiKey: "totalSatFat",   label: "Sat fat",  reverse: false },
];

function barColor(value: number, target: number, reverse: boolean) {
  const pct = target > 0 ? value / target : 0;
  if (reverse) return pct >= 1 ? "var(--status-good)" : pct >= 0.8 ? "var(--status-warn)" : "var(--status-over)";
  return pct <= 0.85 ? "var(--status-good)" : pct <= 1 ? "var(--status-warn)" : "var(--status-over)";
}

/** How many of five headline goals the day hit. */
export function getDayScore(day: ApiDaySummary, goals: DailyGoals) {
  let good = 0;
  if (day.totalCalories <= goals.calories)     good++;
  if (day.totalAddedSugar <= goals.addedSugar) good++;
  if (day.totalSatFat <= goals.satFat)         good++;
  if (day.totalFibre >= goals.fibre)           good++;
  if (day.totalProtein >= goals.protein)       good++;
  return good;
}

function scoreInfo(score: number): { label: string; cls: string } {
  if (score >= 4) return { label: "Great day", cls: "score-chip--green" };
  if (score >= 3) return { label: "Decent day", cls: "score-chip--yellow" };
  return { label: "Needs work", cls: "score-chip--red" };
}

function DayCard({ day, goals, onClick }: { day: ApiDaySummary; goals: DailyGoals; onClick: () => void }) {
  const hasMeals = day.mealCount > 0;
  const { label, cls } = scoreInfo(getDayScore(day, goals));

  return (
    <button type="button" onClick={onClick} className="card day-card">
      <span className="day-card__main">
        <span className="day-card__date">{formatShortDate(day.date)}</span>
        <span className="day-card__totals">
          {hasMeals
            ? <>{Math.round(day.totalCalories)} kcal · P {Math.round(day.totalProtein)}g · C {Math.round(day.totalCarbs)}g · F {Math.round(day.totalFat)}g</>
            : "No meals logged"}
        </span>
        {hasMeals && (
          <span className="day-card__bars">
            {MINI_BARS.map(({ goalKey, apiKey, label: barLabel, reverse }) => {
              const value = Number(day[apiKey] ?? 0);
              const target = goals[goalKey];
              const pct = target > 0 ? Math.min((value / target) * 100, 100) : 0;
              return (
                <span key={goalKey} className="day-card__bar" title={`${barLabel}: ${Math.round(value)} / ${target}`}>
                  <span style={{ width: `${pct}%`, background: barColor(value, target, reverse) }} />
                </span>
              );
            })}
          </span>
        )}
      </span>
      <span className="day-card__side">
        {hasMeals && <span className={`score-chip ${cls}`}>{label}</span>}
        <span className="day-card__meta">
          {day.mealCount} meal{day.mealCount === 1 ? "" : "s"}
          {day.totalSteps > 0 && <> · 👟 {day.totalSteps.toLocaleString()}</>}
        </span>
      </span>
    </button>
  );
}

type Props = {
  days: ApiDaySummary[];
  goals: DailyGoals;
  canExport: boolean;
  onOpenDay: (date: string) => void;
};

export function HistoryList({ days, goals, canExport, onOpenDay }: Props) {
  const [visible, setVisible] = useState(PAGE_SIZE);
  const visibleDays = days.slice(0, visible);

  return (
    <div>
      <div className="history-header">
        <div className="section-label" style={{ marginBottom: 0 }}>
          All logged days ({days.length})
        </div>
        {canExport ? (
          <a className="btn-ghost btn-sm" href="/api/export" download>
            ⬇ Export CSV
          </a>
        ) : (
          <span title="Sign in to export your data">
            <button type="button" className="btn-ghost btn-sm" disabled>
              ⬇ Export CSV
            </button>
          </span>
        )}
      </div>

      {days.length === 0 ? (
        <div className="card empty-state">
          <div className="empty-state__icon">📅</div>
          <p className="empty-state__title">No days logged yet</p>
          <p className="empty-state__body">Start logging meals on the Today tab.</p>
        </div>
      ) : (
        <div className="stack" style={{ gap: "var(--space-3)" }}>
          {visibleDays.map((d) => (
            <DayCard key={d.date} day={d} goals={goals} onClick={() => onOpenDay(d.date)} />
          ))}
          {days.length > visibleDays.length && (
            <button
              type="button"
              className="btn-tonal btn-sm"
              onClick={() => setVisible((count) => count + PAGE_SIZE)}
              style={{ alignSelf: "center" }}
            >
              Load more days ({days.length - visibleDays.length} remaining)
            </button>
          )}
        </div>
      )}
    </div>
  );
}
