"use client";

import { useState, useCallback, useMemo, type ReactNode } from "react";
import { useSession, signOut } from "next-auth/react";
import { type SelectableMetricKey } from "@/app/types";
import { useNutritionData } from "@/app/hooks/useNutritionData";
import { useGoals }      from "@/app/hooks/useGoals";
import { useSavedMeals } from "@/app/hooks/useSavedMeals";
import { DayView }       from "@/app/components/DayView";
import { HistoryList }   from "@/app/components/HistoryList";
import { MetricSelector } from "@/app/components/MetricSelector";
import { StepSyncPanel } from "@/app/components/StepSyncPanel";
import { WeeklyChart }   from "@/app/components/WeeklyChart";
import { WeightPanel }   from "@/app/components/WeightPanel";
import { TimePeriodSelector, type TimePeriod } from "@/app/components/TimePeriodSelector";
import { localISODate } from "@/app/lib/dates";
import { computeStreak } from "@/app/lib/streak";
import { DEMO_COOKIE } from "@/lib/demo";

// ── Loading Skeleton ──────────────────────────────────────────
function PageSkeleton() {
  return (
    <div className="page-wrapper" aria-busy="true">
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 24 }}>
        <div className="skeleton" style={{ width: 40, height: 40, borderRadius: 12 }} />
        <div className="skeleton" style={{ width: 160, height: 28, borderRadius: 8 }} />
      </div>
      <div className="skeleton" style={{ height: 48, borderRadius: 28, marginBottom: 24 }} />
      <div className="skeleton" style={{ height: 72, borderRadius: 36, marginBottom: 20 }} />
      <div className="skeleton" style={{ height: 300, borderRadius: 36, marginBottom: 20 }} />
      <div className="skeleton" style={{ height: 72, borderRadius: 36 }} />
    </div>
  );
}

// ── Tabs ──────────────────────────────────────────────────────
type Tab = "today" | "trend" | "history" | "connect-step";

const TAB_ICONS: Record<Tab, ReactNode> = {
  today: (
    <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="8.5" /><path d="M12 7.5V12l3 2" /></svg>
  ),
  trend: (
    <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 19V5M4 19h16M8 15l3.5-4 3 2.5L19 8" /></svg>
  ),
  history: (
    <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="4" y="5" width="16" height="15" rx="2.5" /><path d="M4 10h16M9 3v4M15 3v4" /></svg>
  ),
  "connect-step": (
    <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="7" y="2.5" width="10" height="19" rx="2.5" /><path d="M11 18.5h2" /></svg>
  ),
};

const TAB_LABELS: Record<Tab, string> = {
  today: "Today",
  trend: "Trends",
  history: "History",
  "connect-step": "Connect",
};

// ── Main Page ─────────────────────────────────────────────────
export default function HomePage() {
  const { data: session, status: sessionStatus } = useSession();
  const isSignedIn = Boolean(session?.user);
  const isDemo = sessionStatus !== "loading" && !session;
  const [tab,            setTab]            = useState<Tab>("today");
  const [historyDate,    setHistoryDate]    = useState<string | null>(null);
  const [selectedMetric, setSelectedMetric] = useState<SelectableMetricKey>("calories");
  const [timePeriod,     setTimePeriod]     = useState<TimePeriod>("1week");
  const [resettingDemo,  setResettingDemo]  = useState(false);
  const [demoError,      setDemoError]      = useState<string | null>(null);

  const today = localISODate();
  // The Today tab always shows today; History shows whichever day was opened.
  const activeDate = tab === "history" && historyDate ? historyDate : today;

  const {
    selectedDay, allDays, loading, dayLoading, error,
    addMeal, deleteMeal, updateMeal, mergeMeals, updateSteps, updateWater, refreshAll,
  } = useNutritionData(activeDate);

  const { goals, updateGoals, hydrated: goalsHydrated } = useGoals();
  const { savedMeals, saveMeal, deleteSavedMeal }       = useSavedMeals();

  // "History" only lists logged days up to today. The demo dataset also carries
  // days in the future (reachable with the date picker).
  const historyDays = useMemo(() => allDays.filter((day) => day.date <= today), [allDays, today]);
  const streak = useMemo(() => computeStreak(allDays, today), [allDays, today]);

  // ── Navigation ────────────────────────────────────────────
  const goTo = useCallback((nextTab: Tab, nextHistoryDate: string | null = null) => {
    setTab(nextTab);
    setHistoryDate(nextHistoryDate);
    window.scrollTo({ top: 0 });
  }, []);

  /** Opens a day: today lives on the Today tab, any other date in History. */
  const openDate = useCallback((date: string) => {
    if (date === localISODate()) goTo("today");
    else goTo("history", date);
  }, [goTo]);

  // ── Demo helpers ──────────────────────────────────────────
  const exitDemo = useCallback(() => {
    document.cookie = `${DEMO_COOKIE}=; path=/; max-age=0`;
    window.location.href = "/login";
  }, []);

  const resetDemo = useCallback(async () => {
    setResettingDemo(true);
    setDemoError(null);
    try {
      const res = await fetch("/api/demo/reset", { method: "POST" });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.error ?? "Could not reset the demo data.");
      }
      goTo("today");
      await refreshAll();
    } catch (err) {
      setDemoError(err instanceof Error ? err.message : "Could not reset the demo data.");
    } finally {
      setResettingDemo(false);
    }
  }, [goTo, refreshAll]);

  if (loading) return <PageSkeleton />;

  const dayViewProps = {
    day: selectedDay,
    loading: dayLoading,
    goals,
    goalsHydrated,
    onGoalsSave: updateGoals,
    onDateChange: openDate,
    onAddMeal: addMeal,
    onUpdateMeal: updateMeal,
    onDeleteMeal: deleteMeal,
    onMergeMeals: mergeMeals,
    onStepsSave: updateSteps,
    onWaterChange: updateWater,
    savedMeals,
    onSaveTemplate: saveMeal,
    onDeleteSaved: deleteSavedMeal,
  };

  return (
    <div className="page-wrapper">
      {/* Header */}
      <header className="page-header">
        <div className="page-header__brand">
          <div className="page-header__logo" aria-hidden="true">🥗</div>
          <div>
            <h1>Nutrition</h1>
            <div className="subtitle">Daily tracker</div>
          </div>
        </div>

        <div className="page-header__actions">
          {streak >= 2 && tab === "today" && (
            <span className="streak-pill" title={`You've logged meals ${streak} days in a row`}>
              🔥 {streak}-day streak
            </span>
          )}
          {session?.user ? (
            <>
              {session.user.image && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={session.user.image} alt={session.user.name ?? "User"} className="page-header__avatar" />
              )}
              <button onClick={() => signOut({ callbackUrl: "/login" })} className="btn-ghost btn-sm">
                Sign out
              </button>
            </>
          ) : isDemo ? (
            <button onClick={exitDemo} className="btn-ghost btn-sm">Sign in →</button>
          ) : null}
        </div>
      </header>

      {/* Demo banner */}
      {isDemo && (
        <div className="demo-banner">
          <span>
            <strong>Demo mode</strong> — explore freely, every feature works.
          </span>
          <button onClick={resetDemo} disabled={resettingDemo} className="btn-ghost btn-xs">
            {resettingDemo ? "Resetting…" : "↺ Reset data"}
          </button>
          {demoError && <span className="demo-banner__error">{demoError}</span>}
        </div>
      )}

      {error && (
        <div className="alert-error" role="alert" style={{ marginBottom: "var(--space-5)" }}>
          <span>⚠️</span>
          <span>Some data didn&apos;t load: {error}</span>
          <button type="button" className="btn-ghost btn-xs" onClick={() => void refreshAll()} style={{ marginLeft: "auto" }}>
            Retry
          </button>
        </div>
      )}

      {/* Tab bar — a pill bar on desktop, a bottom navigation bar on phones */}
      <nav className="tab-bar" aria-label="Sections">
        {(["today", "trend", "history", "connect-step"] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => goTo(t)}
            className={tab === t ? "active" : ""}
            aria-current={tab === t ? "page" : undefined}
          >
            <span className="tab-bar__icon">{TAB_ICONS[t]}</span>
            <span className="tab-bar__label">{TAB_LABELS[t]}</span>
          </button>
        ))}
      </nav>

      {/* TODAY tab */}
      {tab === "today" && (
        <div className="stack" style={{ gap: "var(--space-5)" }}>
          <DayView date={today} {...dayViewProps} />
          <WeightPanel date={today} />
        </div>
      )}

      {/* TREND tab */}
      {tab === "trend" && (
        <div className="stack" style={{ gap: "var(--space-5)" }}>
          <div className="card" style={{ padding: "var(--space-6)", display: "grid", gap: "var(--space-4)" }}>
            <div>
              <div className="section-label" style={{ marginBottom: "var(--space-2)" }}>
                Trend analysis
              </div>
              <p style={{ fontSize: "0.875rem", color: "var(--md-on-surface-variant)", lineHeight: 1.55 }}>
                Averages over the days you logged, with the change against the previous period. Pick a nutrient to chart it.
              </p>
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
            selectedDate={today}
            goals={goals}
            metric={selectedMetric}
            timePeriod={timePeriod}
            onSelectDate={openDate}
          />
        </div>
      )}

      {/* HISTORY tab */}
      {tab === "history" && (
        historyDate ? (
          <div className="stack" style={{ gap: "var(--space-3)" }}>
            <button onClick={() => goTo("history")} className="btn-ghost btn-sm" style={{ alignSelf: "flex-start", paddingLeft: 0 }}>
              ← Back to history
            </button>
            <DayView date={historyDate} {...dayViewProps} />
          </div>
        ) : (
          <HistoryList days={historyDays} goals={goals} canExport={isSignedIn} onOpenDay={openDate} />
        )
      )}

      {/* CONNECT STEP tab */}
      {tab === "connect-step" && (
        isSignedIn ? (
          <StepSyncPanel enabled onRefreshData={refreshAll} />
        ) : (
          <div className="card" style={{ padding: "var(--space-6)", display: "grid", gap: "var(--space-4)" }}>
            <div>
              <div className="section-label" style={{ marginBottom: "var(--space-2)" }}>
                Connect phone steps
              </div>
              <p style={{ fontSize: "0.875rem", color: "var(--md-on-surface-variant)", lineHeight: 1.55, maxWidth: 720 }}>
                Step sync needs a signed-in account so your iPhone or Android device can send steps to the right profile.
                In demo mode you can still log steps manually on the Today tab.
              </p>
            </div>

            <div className="card-inset" style={{ padding: "var(--space-5)", display: "grid", gap: "var(--space-3)" }}>
              <div style={{ fontSize: "0.75rem", fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--md-primary)" }}>
                Available connections
              </div>
              <div style={{ display: "grid", gap: "var(--space-3)" }}>
                <div>
                  <div style={{ fontWeight: 700 }}>iPhone / Apple Health</div>
                  <p style={{ fontSize: "0.8125rem", color: "var(--md-on-surface-variant)", marginTop: 4 }}>
                    Best supported path today: Apple Shortcuts reads your Health steps and syncs them into the app.
                  </p>
                </div>
                <div>
                  <div style={{ fontWeight: 700 }}>Android / Health Connect</div>
                  <p style={{ fontSize: "0.8125rem", color: "var(--md-on-surface-variant)", marginTop: 4 }}>
                    Backend support is prepared, with the full Android setup flow coming next.
                  </p>
                </div>
              </div>
              <button
                type="button"
                className="btn-primary btn-sm"
                onClick={exitDemo}
                style={{ width: "fit-content" }}
              >
                Sign in to connect steps
              </button>
            </div>
          </div>
        )
      )}
    </div>
  );
}
