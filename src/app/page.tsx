"use client";

import { useState, useCallback } from "react";
import { useSession, signOut } from "next-auth/react";
import { type MealFormValues } from "@/app/types";
import { useNutritionData, type ApiDay, type ApiMeal } from "@/app/hooks/useNutritionData";
import { useGoals }      from "@/app/hooks/useGoals";
import { useSavedMeals } from "@/app/hooks/useSavedMeals";
import { DatePicker }    from "@/app/components/DatePicker";
import { DayTotals }     from "@/app/components/DayTotals";
import { MealForm }      from "@/app/components/MealForm";
import { MealList }      from "@/app/components/MealList";
import { WeeklyChart }   from "@/app/components/WeeklyChart";

// ── Targets ───────────────────────────────────────────────────
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
  if (reverse) return pct >= 1 ? "#1B6E33" : pct >= 0.6 ? "#7B5800" : "#BA1A1A";
  return pct <= 0.75 ? "#1B6E33" : pct <= 1 ? "#7B5800" : "#BA1A1A";
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

function scoreInfo(score: number): { emoji: string; label: string; cls: string } {
  if (score >= 4) return { emoji: "🟢", label: "Great day", cls: "score-chip--green" };
  if (score >= 3) return { emoji: "🟡", label: "Decent day", cls: "score-chip--yellow" };
  return { emoji: "🔴", label: "Needs work", cls: "score-chip--red" };
}

// ── Sub-components ────────────────────────────────────────────

function MacroBar({ label, value, target, unit, reverse }: {
  label: string; value: number; target: number; unit: string; reverse: boolean;
}) {
  const pct   = Math.min((value / target) * 100, 150);
  const color = getColor(value, target, reverse);
  return (
    <div style={{ marginBottom: 10 }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4, fontSize: 12 }}>
        <span style={{ color: "var(--md-on-surface-variant)", fontWeight: 600 }}>{label}</span>
        <span style={{ color, fontWeight: 700, fontVariantNumeric: "tabular-nums" }}>
          {Math.round(value * 10) / 10}
          <span style={{ color: "var(--md-on-surface-variant)", fontWeight: 400 }}> / {target}{unit}</span>
        </span>
      </div>
      <div className="progress-bar-track" style={{ height: 6 }}>
        <div
          className="progress-bar-fill"
          style={{ height: "100%", width: `${Math.min(pct, 100)}%`, background: color }}
        />
      </div>
    </div>
  );
}

function DayCard({ day, onClick }: { day: ApiDay; onClick: () => void }) {
  const score = getDayScore(day);
  const { emoji, label, cls } = scoreInfo(score);
  return (
    <div
      onClick={onClick}
      className="card"
      style={{
        padding: "var(--space-4) var(--space-5)",
        cursor: "pointer",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        transition: "box-shadow var(--transition), transform var(--transition)",
        borderRadius: "var(--radius-xl)",
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLElement).style.boxShadow = "var(--shadow-md)";
        (e.currentTarget as HTMLElement).style.transform = "translateY(-1px)";
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLElement).style.boxShadow = "var(--shadow-sm)";
        (e.currentTarget as HTMLElement).style.transform = "none";
      }}
    >
      <div>
        <div style={{ fontWeight: 700, fontSize: 15, letterSpacing: "-0.015em" }}>{formatDate(day.date)}</div>
        <div style={{ fontSize: 12, color: "var(--md-on-surface-variant)", marginTop: 4, lineHeight: 1.4 }}>
          {Math.round(day.totalCalories)} kcal &nbsp;·&nbsp;
          added sugar {Math.round(day.totalAddedSugar)}g &nbsp;·&nbsp;
          fibre {Math.round(day.totalFibre)}g
        </div>
        <div style={{ display: "flex", gap: 4, marginTop: 8 }}>
          {(Object.keys(TARGETS) as TargetKey[]).slice(0, 5).map((k) => {
            const t = TARGETS[k];
            const val = day[`total${k.charAt(0).toUpperCase() + k.slice(1)}` as keyof ApiDay] as number ?? 0;
            const pct = Math.min((val / t.target) * 100, 100);
            const color = getColor(val, t.target, t.reverse);
            return (
              <div key={k} style={{ height: 4, width: 28, background: "var(--md-surface-container)", borderRadius: 99, overflow: "hidden" }}>
                <div style={{ height: "100%", width: `${pct}%`, background: color, borderRadius: 99 }} />
              </div>
            );
          })}
        </div>
      </div>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4 }}>
        <span className={`score-chip ${cls}`}>{emoji} {label}</span>
        <span style={{ fontSize: 11, color: "var(--md-on-surface-variant)" }}>{day.meals.length} meals</span>
      </div>
    </div>
  );
}

function DayDetail({ day, onBack, onEdit, onDelete }: {
  day: ApiDay;
  onBack: () => void;
  onEdit: (meal: ApiMeal) => void;
  onDelete: (mealId: string) => void;
}) {
  const score = getDayScore(day);
  const { emoji, label, cls } = scoreInfo(score);
  return (
    <div className="stack" style={{ gap: "var(--space-4)" }}>
      <button onClick={onBack} className="btn-ghost btn-sm" style={{ width: "fit-content", paddingLeft: 0 }}>
        ← Back to history
      </button>

      <div className="card">
        <div style={{ padding: "var(--space-5)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "var(--space-5)" }}>
            <div>
              <h2 style={{ fontSize: "1.25rem", letterSpacing: "-0.025em" }}>{formatDate(day.date)}</h2>
              <div style={{ fontSize: 12, color: "var(--md-on-surface-variant)", marginTop: 4 }}>
                {day.meals.length} meal{day.meals.length !== 1 ? "s" : ""}
                {day.totalSteps > 0 && ` · ${day.totalSteps.toLocaleString()} steps`}
              </div>
            </div>
            <span className={`score-chip ${cls}`} style={{ fontSize: 13 }}>{emoji} {label}</span>
          </div>

          <div className="stack" style={{ gap: "var(--space-2)" }}>
            {(Object.entries(TARGETS) as [TargetKey, typeof TARGETS[TargetKey]][]).map(([key, cfg]) => {
              const val = day[`total${key.charAt(0).toUpperCase() + key.slice(1)}` as keyof ApiDay] as number ?? 0;
              return <MacroBar key={key} label={cfg.label} value={val} target={cfg.target} unit={cfg.unit} reverse={cfg.reverse} />;
            })}
          </div>
        </div>
      </div>

      {day.meals.length > 0 && (
        <div className="card" style={{ overflow: "hidden" }}>
          <div className="card-header">
            <h2>Meals</h2>
            <span className="badge-pill">{day.meals.length}</span>
          </div>
          {day.meals.map((m) => (
            <div key={m.id} style={{ padding: "var(--space-3) var(--space-5)", borderBottom: "1px solid var(--md-outline-variant)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <div style={{ fontWeight: 700, fontSize: 14, letterSpacing: "-0.015em" }}>{m.name}</div>
                <div style={{ fontSize: 12, color: "var(--md-on-surface-variant)", marginTop: 2 }}>
                  {Math.round(m.calories)} kcal · sat fat {m.satFat}g · added sugar {m.addedSugar}g
                </div>
              </div>
              <div style={{ display: "flex", gap: 4 }}>
                <button className="btn-ghost btn-sm" onClick={() => onEdit(m)}>✏️</button>
                <button className="btn-danger-ghost btn-sm" onClick={() => onDelete(m.id)}>🗑</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Loading Skeleton ──────────────────────────────────────────
function PageSkeleton() {
  return (
    <div className="page-wrapper">
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 24 }}>
        <div className="skeleton" style={{ width: 32, height: 32, borderRadius: 8 }} />
        <div className="skeleton" style={{ width: 180, height: 28, borderRadius: 8 }} />
      </div>
      <div className="skeleton" style={{ width: 180, height: 40, borderRadius: 99, marginBottom: 24 }} />
      <div className="skeleton" style={{ height: 72, borderRadius: 24, marginBottom: 20 }} />
      <div className="skeleton" style={{ height: 260, borderRadius: 24, marginBottom: 20 }} />
      <div className="skeleton" style={{ height: 200, borderRadius: 24, marginBottom: 20 }} />
      <div className="skeleton" style={{ height: 320, borderRadius: 24 }} />
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────
type Tab = "today" | "history";

export default function HomePage() {
  const { data: session } = useSession();
  const [tab,          setTab]          = useState<Tab>("today");
  const [selectedDate, setSelectedDate] = useState(todayISO());
  const [historyDay,   setHistoryDay]   = useState<ApiDay | null>(null);
  const [editingMeal,  setEditingMeal]  = useState<ApiMeal | null>(null);

  const { selectedDay, allDays, loading, addMeal, deleteMeal, updateMeal, updateSteps } =
    useNutritionData(selectedDate);

  const { goals, updateGoals }                    = useGoals();
  const { savedMeals, saveMeal, deleteSavedMeal } = useSavedMeals();

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
    : { calories: 0, protein: 0, carbs: 0, fat: 0, satFat: 0, fibre: 0,
        addedSugar: 0, naturalSugar: 0, salt: 0, alcohol: 0, omega3: 0, steps: 0 };

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

  if (loading) return <PageSkeleton />;

  return (
    <div className="page-wrapper">
      {/* Header */}
      <header className="page-header" style={{ justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "var(--space-3)" }}>
          <div style={{ fontSize: 28 }}>🥗</div>
          <div>
            <h1>Nutrition</h1>
            <div className="subtitle">Daily tracker</div>
          </div>
        </div>

        {/* User info + sign out */}
        {session?.user && (
          <div style={{ display: "flex", alignItems: "center", gap: "var(--space-3)" }}>
            {session.user.image && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={session.user.image}
                alt={session.user.name ?? "User"}
                style={{ width: 32, height: 32, borderRadius: "50%", border: "2px solid var(--md-outline-variant)" }}
              />
            )}
            <button
              onClick={() => signOut({ callbackUrl: "/login" })}
              className="btn-ghost btn-sm"
              title="Sign out"
            >
              Sign out
            </button>
          </div>
        )}
      </header>

      {/* Tab bar */}
      <div className="tab-bar">
        {(["today", "history"] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => { setTab(t); setHistoryDay(null); setEditingMeal(null); }}
            className={tab === t ? "active" : ""}
          >
            {t === "today" ? "Today" : `History${allDays.length > 0 ? ` (${allDays.length})` : ""}`}
          </button>
        ))}
      </div>

      {/* TODAY tab */}
      {tab === "today" && (
        <div className="stack" style={{ gap: "var(--space-5)" }}>
          <DatePicker
            date={selectedDate}
            steps={selectedDay?.totalSteps ?? 0}
            onChange={(d) => { setSelectedDate(d); setEditingMeal(null); }}
            onStepsSave={(steps) => updateSteps(selectedDate, steps)}
          />

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
                name: editingMeal.name, category: editingMeal.category,
                calories: editingMeal.calories,
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
        </div>
      )}

      {/* HISTORY tab */}
      {tab === "history" && (
        historyDay ? (
          <DayDetail
            day={historyDay}
            onBack={() => setHistoryDay(null)}
            onEdit={setEditingMeal}
            onDelete={handleHistoryDelete}
          />
        ) : (
          <div>
            <div className="section-label" style={{ marginBottom: "var(--space-3)" }}>
              All Logged Days ({allDays.length})
            </div>
            {allDays.length === 0 ? (
              <div className="card" style={{ padding: "var(--space-12)", textAlign: "center" }}>
                <div style={{ fontSize: "3rem", marginBottom: "var(--space-3)" }}>📅</div>
                <p style={{ fontWeight: 700, marginBottom: 6 }}>No days logged yet</p>
                <p style={{ fontSize: "0.875rem", color: "var(--md-on-surface-variant)" }}>
                  Start logging meals on the Today tab.
                </p>
              </div>
            ) : (
              <div className="stack" style={{ gap: "var(--space-3)" }}>
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
