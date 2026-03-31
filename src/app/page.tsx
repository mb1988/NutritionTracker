"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { useSession, signOut } from "next-auth/react";
import { type MealFormValues, type SelectableMetricKey } from "@/app/types";
import { useNutritionData, type ApiDay, type ApiMeal } from "@/app/hooks/useNutritionData";
import { useGoals }      from "@/app/hooks/useGoals";
import { useSavedMeals } from "@/app/hooks/useSavedMeals";
import { DatePicker }    from "@/app/components/DatePicker";
import { DayTotals }     from "@/app/components/DayTotals";
import { MealForm }      from "@/app/components/MealForm";
import { MealList }      from "@/app/components/MealList";
import { MetricSelector } from "@/app/components/MetricSelector";
import { WeeklyChart }   from "@/app/components/WeeklyChart";
import { TimePeriodSelector, type TimePeriod } from "@/app/components/TimePeriodSelector";
import { DEMO_COOKIE } from "@/lib/demo";

// ── Targets (order matches DayTotals rows) ────────────────────
const TARGETS = {
  calories:     { label: "Calories",      unit: "kcal", target: 2200, reverse: false },
  protein:      { label: "Protein",       unit: "g",    target: 100,  reverse: true  },
  carbs:        { label: "Carbs",         unit: "g",    target: 250,  reverse: false },
  fat:          { label: "Total Fat",     unit: "g",    target: 70,   reverse: false },
  satFat:       { label: "Sat Fat",       unit: "g",    target: 20,   reverse: false },
  addedSugar:   { label: "Added Sugar",   unit: "g",    target: 25,   reverse: false },
  naturalSugar: { label: "Natural Sugar", unit: "g",    target: 35,   reverse: false },
  fibre:        { label: "Fibre",         unit: "g",    target: 28,   reverse: true  },
  salt:         { label: "Salt",          unit: "g",    target: 6,    reverse: false },
  alcohol:      { label: "Alcohol",       unit: "u",    target: 2,    reverse: false },
  omega3:       { label: "Omega-3",       unit: "mg",   target: 250,  reverse: true  },
} as const;

type TargetKey = keyof typeof TARGETS;

// ── Helpers ───────────────────────────────────────────────────
function localISODate(d: Date = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function todayISO() {
  return localISODate();
}

function formatDate(iso: string) {
  return new Date(iso + "T12:00:00").toLocaleDateString("en-GB", {
    weekday: "short", day: "numeric", month: "short",
  });
}

function getColor(value: number, target: number, reverse: boolean) {
  const pct = value / target;
  if (reverse) return pct >= 1 ? "var(--status-good)" : pct >= 0.8 ? "var(--status-warn)" : "var(--status-over)";
  return pct <= 0.75 ? "var(--status-good)" : pct <= 1 ? "var(--status-warn)" : "var(--status-over)";
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

/** Convert ApiDay to the flat DaySnapshot shape used by DayTotals */
function apiDayToSnapshot(day: ApiDay | null) {
  if (!day) return {
    calories: 0, protein: 0, carbs: 0, fat: 0, satFat: 0, fibre: 0,
    addedSugar: 0, naturalSugar: 0, salt: 0, alcohol: 0, omega3: 0, steps: 0,
  };
  return {
    calories:     day.totalCalories,
    protein:      day.totalProtein,
    carbs:        day.totalCarbs,
    fat:          day.totalFat,
    satFat:       day.totalSatFat,
    fibre:        day.totalFibre,
    addedSugar:   day.totalAddedSugar,
    naturalSugar: day.totalNaturalSugar,
    salt:         day.totalSalt,
    alcohol:      day.totalAlcohol,
    omega3:       day.totalOmega3,
    steps:        day.totalSteps,
  };
}

function DayCard({ day, onClick }: { day: ApiDay; onClick: () => void }) {
  const score = getDayScore(day);
  const { emoji, label, cls } = scoreInfo(score);
  return (
    <div
      onClick={onClick}
      className="card"
      style={{
        padding: "var(--space-5) var(--space-6)",
        cursor: "pointer",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        transition: "background var(--transition), transform var(--transition)",
        background: "var(--md-surface-container)",
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLElement).style.background = "var(--md-surface-container-high)";
        (e.currentTarget as HTMLElement).style.transform = "translateY(-1px)";
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLElement).style.background = "var(--md-surface-container)";
        (e.currentTarget as HTMLElement).style.transform = "none";
      }}
    >
      <div>
        <div style={{ fontWeight: 800, fontSize: 15, letterSpacing: "-0.02em" }}>{formatDate(day.date)}</div>
        <div style={{ fontSize: 12, color: "var(--md-on-surface-variant)", marginTop: 4, lineHeight: 1.5 }}>
          {Math.round(day.totalCalories)} kcal &nbsp;·&nbsp;
          P {Math.round(day.totalProtein)}g &nbsp;·&nbsp;
          C {Math.round(day.totalCarbs)}g &nbsp;·&nbsp;
          F {Math.round(day.totalFat)}g
        </div>
        <div style={{ display: "flex", gap: 4, marginTop: 10 }}>
          {(Object.keys(TARGETS) as TargetKey[]).slice(0, 5).map((k) => {
            const t = TARGETS[k];
            const val = day[`total${k.charAt(0).toUpperCase() + k.slice(1)}` as keyof ApiDay] as number ?? 0;
            const pct = Math.min((val / t.target) * 100, 100);
            const color = getColor(val, t.target, t.reverse);
            return (
              <div key={k} style={{ height: 5, width: 32, background: "rgba(255,255,255,0.08)", borderRadius: 99, overflow: "hidden" }}>
                <div style={{ height: "100%", width: `${pct}%`, background: color, borderRadius: 99 }} />
              </div>
            );
          })}
        </div>
      </div>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 6 }}>
        <span className={`score-chip ${cls}`}>{emoji} {label}</span>
        <span style={{ fontSize: 11, color: "var(--md-on-surface-variant)", fontWeight: 600 }}>{day.meals.length} meals</span>
      </div>
    </div>
  );
}

function DayDetail({ day, date, goals, onGoalsSave, onBack, onDateChange, onAddMeal, onUpdateMeal, onDeleteMeal, onStepsSave, savedMeals, onSaveTemplate, onDeleteSaved }: {
  day: ApiDay | null;
  date: string;
  goals: Parameters<typeof DayTotals>[0]["goals"];
  onGoalsSave: Parameters<typeof DayTotals>[0]["onGoalsSave"];
  onBack: () => void;
  onDateChange: (date: string) => void;
  onAddMeal: (date: string, values: MealFormValues) => Promise<void>;
  onUpdateMeal: (mealId: string, values: MealFormValues, date: string) => Promise<void>;
  onDeleteMeal: (mealId: string, date: string) => Promise<void>;
  onStepsSave: (date: string, steps: number) => Promise<void>;
  savedMeals: ReturnType<typeof useSavedMeals>["savedMeals"];
  onSaveTemplate: (values: MealFormValues) => Promise<void>;
  onDeleteSaved: (id: string) => Promise<void>;
}) {
  const [editingMeal, setEditingMeal] = useState<ApiMeal | null>(null);
  const [draftSteps, setDraftSteps] = useState("");
  const [stepsSaved, setStepsSaved] = useState(false);
  const formRef = useRef<HTMLDivElement | null>(null);

  // Clear edit state + steps draft when navigating to a different day
  useEffect(() => {
    setEditingMeal(null);
    setDraftSteps("");
  }, [date]);

  // Scroll to form when editing starts
  useEffect(() => {
    if (!editingMeal) return;
    const raf = requestAnimationFrame(() => {
      formRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
    });
    return () => cancelAnimationFrame(raf);
  }, [editingMeal]);

  const today = localISODate();
  const isToday = date === today;

  function offsetDate(iso: string, delta: number): string {
    const d = new Date(`${iso}T00:00:00`);
    d.setDate(d.getDate() + delta);
    return localISODate(d);
  }

  function handleStepsSubmit() {
    const n = parseInt(draftSteps, 10);
    const val = isNaN(n) || n < 0 ? 0 : n;
    onStepsSave(date, val);
    setStepsSaved(true);
    setTimeout(() => setStepsSaved(false), 1500);
  }

  const currentSteps = day?.totalSteps ?? 0;
  const displaySteps = draftSteps !== "" ? draftSteps : currentSteps > 0 ? String(currentSteps) : "";

  return (
    <div className="stack" style={{ gap: "var(--space-5)" }}>
      <button onClick={onBack} className="btn-ghost btn-sm" style={{ width: "fit-content", paddingLeft: 0 }}>
        ← Back to history
      </button>

      {/* Date navigation */}
      <div className="card date-picker" style={{ flexWrap: "wrap", gap: "var(--space-3)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2)", flex: 1, minWidth: 200 }}>
          <button
            type="button"
            className="btn-ghost btn-sm"
            onClick={() => onDateChange(offsetDate(date, -1))}
            title="Previous day"
            style={{ padding: "var(--space-1) var(--space-2)", fontSize: "1rem", flexShrink: 0 }}
          >
            ‹
          </button>
          <div className="date-picker__info" style={{ flex: 1, textAlign: "center" }}>
            <span className="date-picker__eyebrow">Viewing</span>
            <span className="date-picker__value">
              {new Date(`${date}T00:00:00`).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" })}
            </span>
          </div>
          <button
            type="button"
            className="btn-ghost btn-sm"
            onClick={() => onDateChange(offsetDate(date, 1))}
            title="Next day"
            disabled={isToday}
            style={{ padding: "var(--space-1) var(--space-2)", fontSize: "1rem", flexShrink: 0 }}
          >
            ›
          </button>
        </div>

        {/* Steps */}
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
          {stepsSaved && (
            <span style={{ fontSize: "0.75rem", color: "var(--md-primary-container)", fontWeight: 700 }}>✓</span>
          )}
        </div>

        {/* Calendar input */}
        <input
          type="date"
          value={date}
          max={today}
          onChange={(e) => {
            if (e.target.value) {
              onDateChange(e.target.value);
            }
          }}
          className="date-picker__input"
        />
      </div>

      {/* Day summary — reuses the same DayTotals component as Today */}
      <DayTotals
        totals={apiDayToSnapshot(day)}
        goals={goals}
        mealCount={day?.meals.length ?? 0}
        selectedDate={date}
        onGoalsSave={onGoalsSave}
      />

      {/* Meals list with consistent MealItem display */}
      <MealList
        meals={(day?.meals ?? []).map((m) => ({ ...m, date }))}
        onEdit={(meal) => setEditingMeal(meal as ApiMeal)}
        onDelete={(id) => onDeleteMeal(id, date)}
      />

      {/* Add / edit meal form — with saved meal templates */}
      <div ref={formRef} style={{ scrollMarginTop: "var(--space-6)" }}>
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
            onSubmit={async (values) => { await onUpdateMeal(editingMeal.id, values, date); setEditingMeal(null); }}
            onCancel={() => setEditingMeal(null)}
            onSaveTemplate={onSaveTemplate}
          />
        ) : (
          <MealForm
            onSubmit={(values) => onAddMeal(date, values)}
            savedMeals={savedMeals}
            onSaveTemplate={onSaveTemplate}
            onDeleteSaved={onDeleteSaved}
          />
        )}
      </div>
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
  const { data: session, status: sessionStatus } = useSession();
  const isDemo = sessionStatus !== "loading" && !session;
  const [tab,            setTab]            = useState<Tab>("today");
  const [selectedDate,   setSelectedDate]   = useState(todayISO());
  const [historyDate,    setHistoryDate]    = useState<string | null>(null);
  const [editingMeal,    setEditingMeal]    = useState<ApiMeal | null>(null);
  const [selectedMetric, setSelectedMetric] = useState<SelectableMetricKey>("calories");
  const [timePeriod,     setTimePeriod]     = useState<TimePeriod>("1week");
  const [editScrollRequest, setEditScrollRequest] = useState(0);
  const [resettingDemo,  setResettingDemo]  = useState(false);
  const mealFormRef = useRef<HTMLDivElement | null>(null);

  const { selectedDay, allDays, loading, addMeal, deleteMeal, updateMeal, updateSteps, refreshAll } =
    useNutritionData(selectedDate);

  const { goals, updateGoals }                    = useGoals();
  const { savedMeals, saveMeal, deleteSavedMeal } = useSavedMeals();

  // ── Demo helpers ──────────────────────────────────────────
  const exitDemo = useCallback(() => {
    document.cookie = `${DEMO_COOKIE}=; path=/; max-age=0`;
    window.location.href = "/login";
  }, []);

  const resetDemo = useCallback(async () => {
    setResettingDemo(true);
    try {
      await fetch("/api/demo/reset", { method: "POST" });
      setSelectedDate(todayISO());
      setHistoryDate(null);
      setEditingMeal(null);
      await refreshAll();
    } catch {
      // non-fatal
    } finally {
      setResettingDemo(false);
    }
  }, [refreshAll]);

  const totals = apiDayToSnapshot(selectedDay ?? null);

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

  /** Navigate to a past day's detail view, scrolling to top */
  const navigateToHistoryDate = useCallback((d: string) => {
    if (d === todayISO()) {
      setSelectedDate(todayISO());
      setHistoryDate(null);
      setTab("today");
      setEditingMeal(null);
      window.scrollTo({ top: 0 });
      return;
    }
    setHistoryDate(d);
    setTab("history");
    setEditingMeal(null);
    window.scrollTo({ top: 0 });
  }, []);

  /** Return to Today tab, scrolling to top */
  const navigateToToday = useCallback(() => {
    setSelectedDate(todayISO());
    setHistoryDate(null);
    setTab("today");
    setEditingMeal(null);
    window.scrollTo({ top: 0 });
  }, []);


  useEffect(() => {
    if (!editingMeal || tab !== "today" || editScrollRequest === 0 || loading) return;

    const rafId = window.requestAnimationFrame(() => {
      mealFormRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "nearest",
      });
    });

    return () => window.cancelAnimationFrame(rafId);
  }, [editingMeal, tab, editScrollRequest, loading]);

  if (loading) return <PageSkeleton />;

  return (
    <div className="page-wrapper">
      {/* Header */}
      <header className="page-header" style={{ justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "var(--space-3)" }}>
          <div style={{
            width: 40, height: 40, borderRadius: "var(--radius-md)",
            background: "var(--md-surface-container-high)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 22,
            boxShadow: "0 0 20px rgba(0,254,102,0.1)",
          }}>🥗</div>
          <div>
            <h1>Nutrition</h1>
            <div className="subtitle">Daily tracker</div>
          </div>
        </div>

        {/* User info / demo badge */}
        {session?.user ? (
          <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2)" }}>
            {session.user.image && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={session.user.image}
                alt={session.user.name ?? "User"}
                style={{ width: 34, height: 34, borderRadius: "50%", border: "2px solid var(--md-outline-variant)" }}
              />
            )}
            <button
              onClick={() => signOut({ callbackUrl: "/login" })}
              className="btn-ghost btn-sm"
              title="Sign out"
              style={{ fontSize: "0.75rem" }}
            >
              Sign out
            </button>
          </div>
        ) : isDemo ? (
          <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2)" }}>
            <span style={{
              fontSize: "0.6875rem",
              fontWeight: 700,
              padding: "4px 10px",
              borderRadius: "var(--radius-full)",
              background: "rgba(104, 185, 132, 0.12)",
              color: "var(--md-primary)",
              letterSpacing: "0.04em",
              textTransform: "uppercase",
            }}>
              Demo
            </span>
            <button onClick={exitDemo} className="btn-ghost btn-sm" style={{ fontSize: "0.75rem" }}>
              Sign in →
            </button>
          </div>
        ) : null}
      </header>

      {/* Demo banner */}
      {isDemo && (
        <div style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "var(--space-3)",
          padding: "var(--space-3) var(--space-4)",
          borderRadius: "var(--radius-md)",
          background: "rgba(104, 185, 132, 0.06)",
          border: "1px solid rgba(104, 185, 132, 0.15)",
          fontSize: "0.8125rem",
          flexWrap: "wrap",
        }}>
          <span style={{ color: "var(--md-on-surface-variant)" }}>
            🔍 <strong style={{ color: "var(--md-primary)" }}>Demo mode</strong> — explore freely, all features work!
          </span>
          <button
            onClick={resetDemo}
            disabled={resettingDemo}
            className="btn-ghost btn-sm"
            style={{ fontSize: "0.75rem", whiteSpace: "nowrap" }}
          >
            {resettingDemo ? "Resetting…" : "↺ Reset data"}
          </button>
        </div>
      )}

      {/* Tab bar */}
      <div className="tab-bar">
        {(["today", "history"] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => {
              if (t === "today") {
                navigateToToday();
              } else {
                setTab("history");
                setHistoryDate(null);
                setEditingMeal(null);
                window.scrollTo({ top: 0 });
              }
            }}
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
            onChange={(d) => {
              if (d === todayISO()) {
                setSelectedDate(d);
                setEditingMeal(null);
              } else {
                navigateToHistoryDate(d);
              }
            }}
            onStepsSave={(steps) => updateSteps(selectedDate, steps)}
          />

          <DayTotals
            totals={totals}
            goals={goals}
            mealCount={selectedDay?.meals.length ?? 0}
            selectedDate={selectedDate}
            onGoalsSave={updateGoals}
          />

          <div className="stack" style={{ gap: "var(--space-3)" }}>
            <div className="section-label" style={{ marginBottom: 0 }}>
              Trend Analysis
            </div>
            <TimePeriodSelector selected={timePeriod} onSelect={setTimePeriod} />
            <MetricSelector
              allDays={allDays}
              goals={goals}
              selectedMetric={selectedMetric}
              timePeriod={timePeriod}
              onSelect={setSelectedMetric}
            />
          </div>

          <WeeklyChart
            allDays={allDays}
            selectedDate={selectedDate}
            goals={goals}
            metric={selectedMetric}
            timePeriod={timePeriod}
            onSelectDate={(d) => {
              if (d === todayISO()) {
                setSelectedDate(d);
                setEditingMeal(null);
              } else {
                navigateToHistoryDate(d);
              }
            }}
          />

          <div ref={mealFormRef} style={{ scrollMarginTop: "var(--space-6)" }}>
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
                onSaveTemplate={saveMeal}
              />
            ) : (
              <MealForm
                onSubmit={handleAdd}
                savedMeals={savedMeals}
                onSaveTemplate={saveMeal}
                onDeleteSaved={deleteSavedMeal}
              />
            )}
          </div>

          <MealList
            meals={(selectedDay?.meals ?? []).map((m) => ({ ...m, date: selectedDate }))}
            onEdit={(meal) => {
              setEditingMeal(meal as ApiMeal);
              setEditScrollRequest((prev) => prev + 1);
            }}
            onDelete={handleDelete}
          />
        </div>
      )}

      {/* HISTORY tab */}
      {tab === "history" && (
        historyDate ? (
          <DayDetail
            day={allDays.find((d) => d.date === historyDate) ?? null}
            date={historyDate}
            goals={goals}
            onGoalsSave={updateGoals}
            onBack={() => { setHistoryDate(null); window.scrollTo({ top: 0 }); }}
            onDateChange={navigateToHistoryDate}
            onAddMeal={addMeal}
            onUpdateMeal={updateMeal}
            onDeleteMeal={deleteMeal}
            onStepsSave={updateSteps}
            savedMeals={savedMeals}
            onSaveTemplate={saveMeal}
            onDeleteSaved={deleteSavedMeal}
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
                  <DayCard key={d.date} day={d} onClick={() => navigateToHistoryDate(d.date)} />
                ))}
              </div>
            )}
          </div>
        )
      )}
    </div>
  );
}
