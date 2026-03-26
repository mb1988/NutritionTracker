"use client";

import { useState, useCallback } from "react";
import { type MealFormValues } from "@/app/types";
import { useNutritionData, type ApiDay, type ApiMeal } from "@/app/hooks/useNutritionData";
import { useGoals }      from "@/app/hooks/useGoals";
import { useSavedMeals } from "@/app/hooks/useSavedMeals";
import { DatePicker }    from "@/app/components/DatePicker";
import { DayTotals }     from "@/app/components/DayTotals";
import { MealForm }      from "@/app/components/MealForm";
import { MealList }      from "@/app/components/MealList";
import { WeeklyChart }   from "@/app/components/WeeklyChart";

// ── TARGETS (matching old app) ────────────────────────────────
const TARGETS = {
  calories:     { label: "Calories",      unit: "kcal", target: 2200, reverse: false },
  addedSugar:   { label: "Added Sugar",   unit: "g",    target: 25,   reverse: false },
  naturalSugar: { label: "Natural Sugar", unit: "g",    target: 35,   reverse: false },
  satFat:       { label: "Sat Fat",       unit: "g",    target: 20,   reverse: false },
  fat:          { label: "Total Fat",     unit: "g",    target: 70,   reverse: false },
  carbs:        { label: "Carbs",         unit: "g",    target: 250,  reverse: false },
  protein:      { label: "Protein",       unit: "g",    target: 100,  reverse: true  },
  fibre:        { label: "Fibre",         unit: "g",    target: 28,   reverse: true  },
  salt:         { label: "Salt",          unit: "g",    target: 6,    reverse: false },
  alcohol:      { label: "Alcohol",       unit: "u",    target: 2,    reverse: false },
  omega3:       { label: "Omega-3",       unit: "mg",   target: 250,  reverse: true  },
} as const;

type TargetKey = keyof typeof TARGETS;

// ── Helpers ───────────────────────────────────────────────────
function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

function formatDate(iso: string) {
  return new Date(iso + "T12:00:00").toLocaleDateString("en-GB", {
    weekday: "short", day: "numeric", month: "short",
  });
}

function getColor(value: number, target: number, reverse: boolean) {
  const pct = value / target;
  if (reverse) return pct >= 1 ? "#16a34a" : pct >= 0.6 ? "#d97706" : "#dc2626";
  return pct <= 0.75 ? "#16a34a" : pct <= 1 ? "#d97706" : "#dc2626";
}

function getDayScore(day: ApiDay) {
  let good = 0;
  if (day.totalCalories <= 2200)  good++;
  if (day.totalAddedSugar <= 25)  good++;
  if (day.totalSatFat <= 20)      good++;
  if (day.totalFibre >= 25)       good++;
  if (day.totalProtein >= 80)     good++;
  return good;
}

function scoreEmoji(score: number) {
  if (score >= 4) return { e: "🟢", label: "Great day" };
  if (score >= 3) return { e: "🟡", label: "Decent day" };
  return { e: "🔴", label: "Tough day" };
}

// ── Sub-components ────────────────────────────────────────────

function MacroBar({ label, value, target, unit, reverse }: {
  label: string; value: number; target: number; unit: string; reverse: boolean;
}) {
  const pct  = Math.min((value / target) * 100, 150);
  const color = getColor(value, target, reverse);
  return (
    <div style={{ marginBottom: 10 }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 3, fontSize: 12 }}>
        <span style={{ color: "var(--color-text-muted)" }}>{label}</span>
        <span style={{ color, fontWeight: 700 }}>
          {Math.round(value * 10) / 10}{unit}
          <span style={{ color: "var(--color-text-muted)", fontWeight: 400 }}> / {target}{unit}</span>
        </span>
      </div>
      <div style={{ height: 5, background: "var(--color-border)", borderRadius: 99, overflow: "hidden" }}>
        <div style={{ height: "100%", width: `${Math.min(pct, 100)}%`, background: color, borderRadius: 99, transition: "width 0.3s" }} />
      </div>
    </div>
  );
}

function DayCard({ day, onClick }: { day: ApiDay; onClick: () => void }) {
  const score = getDayScore(day);
  const { e } = scoreEmoji(score);
  return (
    <div onClick={onClick} className="card" style={{ padding: "var(--space-3) var(--space-4)", cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
      <div>
        <div style={{ fontWeight: 600, fontSize: 14 }}>{formatDate(day.date)}</div>
        <div style={{ fontSize: 12, color: "var(--color-text-muted)", marginTop: 2 }}>
          {Math.round(day.totalCalories)} kcal · sugar {Math.round(day.totalAddedSugar)}g added · fibre {Math.round(day.totalFibre)}g
        </div>
        <div style={{ display: "flex", gap: 4, marginTop: 6 }}>
          {(Object.keys(TARGETS) as TargetKey[]).slice(0, 5).map((k) => {
            const t = TARGETS[k];
            const val = day[`total${k.charAt(0).toUpperCase() + k.slice(1)}` as keyof ApiDay] as number ?? 0;
            const pct = Math.min((val / t.target) * 100, 100);
            const color = getColor(val, t.target, t.reverse);
            return (
              <div key={k} style={{ height: 3, width: 24, background: "var(--color-border)", borderRadius: 99, overflow: "hidden" }}>
                <div style={{ height: "100%", width: `${pct}%`, background: color, borderRadius: 99 }} />
              </div>
            );
          })}
        </div>
      </div>
      <div style={{ fontSize: 22 }}>{e}</div>
    </div>
  );
}

function DayDetail({ day, onBack, onEdit, onDelete, savedMeals, onSaveTemplate, onDeleteSaved }: {
  day: ApiDay;
  onBack: () => void;
  onEdit: (meal: ApiMeal) => void;
  onDelete: (mealId: string) => void;
  savedMeals: ReturnType<typeof useSavedMeals>["savedMeals"];
  onSaveTemplate: ReturnType<typeof useSavedMeals>["saveMeal"];
  onDeleteSaved: ReturnType<typeof useSavedMeals>["deleteSavedMeal"];
}) {
  const score = getDayScore(day);
  const { e, label } = scoreEmoji(score);
  return (
    <div>
      <button onClick={onBack} className="btn-ghost btn-sm" style={{ marginBottom: "var(--space-4)", paddingLeft: 0 }}>
        ← Back
      </button>
      <div className="card" style={{ padding: "var(--space-5)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "var(--space-5)" }}>
          <div>
            <h2 style={{ fontSize: "1.25rem" }}>{formatDate(day.date)}</h2>
            <div style={{ fontSize: 12, color: "var(--color-text-muted)", marginTop: 4 }}>
              {day.meals.length} meals · {day.totalSteps.toLocaleString()} steps
            </div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: 28 }}>{e}</div>
            <div style={{ fontSize: 11, color: "var(--color-text-muted)" }}>{label}</div>
          </div>
        </div>
        {(Object.entries(TARGETS) as [TargetKey, typeof TARGETS[TargetKey]][]).map(([key, cfg]) => {
          const val = day[`total${key.charAt(0).toUpperCase() + key.slice(1)}` as keyof ApiDay] as number ?? 0;
          return <MacroBar key={key} label={cfg.label} value={val} target={cfg.target} unit={cfg.unit} reverse={cfg.reverse} />;
        })}
      </div>
      {day.meals.length > 0 && (
        <div className="card" style={{ marginTop: "var(--space-4)", overflow: "hidden" }}>
          <div className="card-header"><h2>Meals</h2><span className="badge-pill">{day.meals.length}</span></div>
          {day.meals.map((m) => (
            <div key={m.id} style={{ padding: "var(--space-3) var(--space-4)", borderBottom: "1px solid var(--color-border)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <div style={{ fontWeight: 600, fontSize: 14 }}>{m.name}</div>
                <div style={{ fontSize: 12, color: "var(--color-text-muted)", marginTop: 2 }}>
                  {Math.round(m.calories)} kcal · sat fat {m.satFat}g · added sugar {m.addedSugar}g
                </div>
              </div>
              <div style={{ display: "flex", gap: 4 }}>
                <button className="btn-ghost btn-sm" onClick={() => onEdit(m)}>Edit</button>
                <button className="btn-danger-ghost btn-sm" onClick={() => onDelete(m.id)}>Del</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────

type Tab = "today" | "history";

export default function HomePage() {
  const [tab,          setTab]          = useState<Tab>("today");
  const [selectedDate, setSelectedDate] = useState(todayISO());
  const [historyDay,   setHistoryDay]   = useState<ApiDay | null>(null);
  const [editingMeal,  setEditingMeal]  = useState<ApiMeal | null>(null);

  const { selectedDay, allDays, loading, addMeal, deleteMeal, updateMeal } =
    useNutritionData(selectedDate);

  const { goals, updateGoals }                    = useGoals();
  const { savedMeals, saveMeal, deleteSavedMeal } = useSavedMeals();

  // Build DaySnapshot from API day for existing components
  const totals = selectedDay
    ? {
        calories:     selectedDay.totalCalories,
        protein:      selectedDay.totalProtein,
        carbs:        selectedDay.totalCarbs,
        fat:          selectedDay.totalFat,
        satFat:       selectedDay.totalSatFat,
        fibre:        selectedDay.totalFibre,
        addedSugar:   selectedDay.totalAddedSugar,
        naturalSugar: selectedDay.totalNaturalSugar,
        salt:         selectedDay.totalSalt,
        alcohol:      selectedDay.totalAlcohol,
        omega3:       selectedDay.totalOmega3,
        steps:        selectedDay.totalSteps,
      }
    : { calories: 0, protein: 0, carbs: 0, fat: 0, satFat: 0, fibre: 0, addedSugar: 0, naturalSugar: 0, salt: 0, alcohol: 0, omega3: 0, steps: 0 };

  const mealsForChart = allDays.flatMap((d) =>
    d.meals.map((m) => ({ ...m, date: d.date })),
  );

  const handleAdd = useCallback(
    (values: MealFormValues) => addMeal(selectedDate, values),
    [addMeal, selectedDate],
  );

  const handleUpdate = useCallback(
    async (values: MealFormValues) => {
      if (!editingMeal) return;
      await updateMeal(editingMeal.id, values, selectedDate);
      setEditingMeal(null);
    },
    [editingMeal, updateMeal, selectedDate],
  );

  const handleDelete = useCallback(
    async (id: string) => {
      await deleteMeal(id, selectedDate);
      setEditingMeal((prev) => (prev?.id === id ? null : prev));
    },
    [deleteMeal, selectedDate],
  );

  const handleHistoryDelete = useCallback(
    async (id: string) => {
      if (!historyDay) return;
      await deleteMeal(id, historyDay.date);
      setHistoryDay((prev) => prev ? { ...prev, meals: prev.meals.filter((m) => m.id !== id) } : null);
    },
    [deleteMeal, historyDay],
  );

  if (loading) return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--color-text-muted)" }}>
      Loading…
    </div>
  );

  return (
    <div className="page-wrapper">
      <header className="page-header">
        <h1>Nutrition</h1>
        <span className="subtitle">Tracker</span>
      </header>

      {/* Tabs */}
      <div style={{ display: "flex", gap: "var(--space-2)", marginBottom: "var(--space-5)" }}>
        {(["today", "history"] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => { setTab(t); setHistoryDay(null); setEditingMeal(null); }}
            className={tab === t ? "btn-primary btn-sm" : "btn-ghost btn-sm"}
            style={{ textTransform: "capitalize" }}
          >
            {t === "today" ? "Today" : `History (${allDays.length})`}
          </button>
        ))}
      </div>

      {/* TODAY tab */}
      {tab === "today" && (
        <>
          <DatePicker date={selectedDate} onChange={(d) => { setSelectedDate(d); setEditingMeal(null); }} />

          <DayTotals
            totals={totals}
            goals={goals}
            mealCount={selectedDay?.meals.length ?? 0}
            onGoalsSave={updateGoals}
          />

          <WeeklyChart
            allMeals={mealsForChart}
            selectedDate={selectedDate}
            goals={goals}
            onSelectDate={(d) => { setSelectedDate(d); setEditingMeal(null); }}
          />

          {editingMeal ? (
            <MealForm
              key={editingMeal.id}
              initialValues={{
                name: editingMeal.name, calories: editingMeal.calories,
                protein: editingMeal.protein, carbs: editingMeal.carbs,
                fat: editingMeal.fat, satFat: editingMeal.satFat,
                fibre: editingMeal.fibre, addedSugar: editingMeal.addedSugar,
                naturalSugar: editingMeal.naturalSugar, salt: editingMeal.salt,
                alcohol: editingMeal.alcohol ?? 0,
                omega3: editingMeal.omega3 ?? 0,
              }}
              onSubmit={handleUpdate}
              onCancel={() => setEditingMeal(null)}
            />
          ) : (
            <MealForm
              onSubmit={handleAdd}
              savedMeals={savedMeals}
              onSaveTemplate={saveMeal}
              onDeleteSaved={deleteSavedMeal}
            />
          )}

          <MealList
            meals={(selectedDay?.meals ?? []).map((m) => ({ ...m, date: selectedDate }))}
            onEdit={(meal) => { setEditingMeal(meal as ApiMeal); window.scrollTo({ top: 0, behavior: "smooth" }); }}
            onDelete={handleDelete}
          />
        </>
      )}

      {/* HISTORY tab */}
      {tab === "history" && (
        historyDay ? (
          <DayDetail
            day={historyDay}
            onBack={() => setHistoryDay(null)}
            onEdit={setEditingMeal}
            onDelete={handleHistoryDelete}
            savedMeals={savedMeals}
            onSaveTemplate={saveMeal}
            onDeleteSaved={deleteSavedMeal}
          />
        ) : (
          <div>
            <div style={{ fontSize: 12, color: "var(--color-text-muted)", fontWeight: 600, letterSpacing: "0.05em", textTransform: "uppercase", marginBottom: "var(--space-3)" }}>
              All Logged Days ({allDays.length})
            </div>
            {allDays.length === 0 ? (
              <div className="card" style={{ padding: "var(--space-12)", textAlign: "center", color: "var(--color-text-muted)" }}>
                No days logged yet
              </div>
            ) : (
              <div className="stack" style={{ gap: "var(--space-2)" }}>
                {allDays.map((d) => (
                  <DayCard key={d.date} day={d} onClick={() => setHistoryDay(d)} />
                ))}
              </div>
            )}
          </div>
        )
      )}
    </div>
  );
}
