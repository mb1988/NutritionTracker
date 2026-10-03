"use client";

import { useEffect, useRef, useState } from "react";
import { type DailyGoals, type MealFormValues, type SavedMeal } from "@/app/types";
import { type ApiDay, type ApiMeal } from "@/app/hooks/useNutritionData";
import { DatePicker } from "@/app/components/DatePicker";
import { DayTotals } from "@/app/components/DayTotals";
import { MealForm } from "@/app/components/MealForm";
import { MealList } from "@/app/components/MealList";

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

function toFormValues(meal: ApiMeal): MealFormValues {
  return {
    name: meal.name, category: meal.category,
    calories: meal.calories,
    protein: meal.protein, carbs: meal.carbs,
    fat: meal.fat, satFat: meal.satFat,
    fibre: meal.fibre, addedSugar: meal.addedSugar,
    naturalSugar: meal.naturalSugar, salt: meal.salt,
    alcohol: meal.alcohol ?? 0,
    omega3: meal.omega3 ?? 0,
  };
}

type Props = {
  date: string;
  day: ApiDay | null;
  loading: boolean;
  goals: DailyGoals;
  goalsHydrated: boolean;
  onGoalsSave: (goals: DailyGoals) => Promise<void>;
  onDateChange: (date: string) => void;
  onAddMeal: (date: string, values: MealFormValues) => Promise<void>;
  onUpdateMeal: (mealId: string, values: MealFormValues, date: string) => Promise<void>;
  onDeleteMeal: (mealId: string, date: string) => Promise<void>;
  onMergeMeals: (date: string, values: MealFormValues, mealIdsToDelete: string[]) => Promise<void>;
  onStepsSave: (date: string, steps: number) => Promise<void>;
  onWaterChange: (date: string, waterMl: number) => Promise<void>;
  savedMeals: SavedMeal[];
  onSaveTemplate: (values: MealFormValues) => Promise<void>;
  onDeleteSaved: (id: string) => Promise<void>;
};

/** One day: date navigation, progress, the meal composer and the meal list. */
export function DayView({
  date, day, loading, goals, goalsHydrated, onGoalsSave, onDateChange,
  onAddMeal, onUpdateMeal, onDeleteMeal, onMergeMeals, onStepsSave, onWaterChange,
  savedMeals, onSaveTemplate, onDeleteSaved,
}: Props) {
  const [editingMeal, setEditingMeal] = useState<ApiMeal | null>(null);
  const [editScrollRequest, setEditScrollRequest] = useState(0);
  const formRef = useRef<HTMLDivElement | null>(null);

  // Editing belongs to the day it started on.
  useEffect(() => {
    setEditingMeal(null);
  }, [date]);

  useEffect(() => {
    if (!editingMeal || editScrollRequest === 0) return;
    const raf = requestAnimationFrame(() => {
      formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
    return () => cancelAnimationFrame(raf);
  }, [editingMeal, editScrollRequest]);

  const meals = day?.meals ?? [];

  return (
    <div className="stack" style={{ gap: "var(--space-5)" }}>
      <DatePicker date={date} onChange={onDateChange} />

      {loading ? (
        <>
          <div className="skeleton" style={{ height: 300, borderRadius: "var(--radius-xl)" }} />
          <div className="skeleton" style={{ height: 72, borderRadius: "var(--radius-xl)" }} />
          <div className="skeleton" style={{ height: 160, borderRadius: "var(--radius-xl)" }} />
        </>
      ) : (
        <>
          <DayTotals
            totals={apiDayToSnapshot(day)}
            goals={goals}
            goalsHydrated={goalsHydrated}
            mealCount={meals.length}
            selectedDate={date}
            onGoalsSave={onGoalsSave}
            meals={meals.map(toFormValues)}
            savedMeals={savedMeals.map(({ id: _id, ...meal }) => meal)}
            waterMl={day?.totalWaterMl ?? 0}
            stepSource={day?.stepsSource ?? null}
            stepsSyncedAt={day?.stepsSyncedAt ?? null}
            onStepsSave={(steps) => onStepsSave(date, steps)}
            onWaterChange={(waterMl) => onWaterChange(date, waterMl)}
          />

          <div ref={formRef} style={{ scrollMarginTop: "var(--space-6)" }}>
            {editingMeal ? (
              <MealForm
                key={editingMeal.id}
                initialValues={toFormValues(editingMeal)}
                onSubmit={async (values) => {
                  await onUpdateMeal(editingMeal.id, values, date);
                  setEditingMeal(null);
                }}
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

          <MealList
            meals={meals.map((m) => ({ ...m, date }))}
            onEdit={(meal) => {
              setEditingMeal(meal as ApiMeal);
              setEditScrollRequest((prev) => prev + 1);
            }}
            onDelete={async (id) => {
              await onDeleteMeal(id, date);
              setEditingMeal((prev) => (prev?.id === id ? null : prev));
            }}
            onMerge={(merged, ids) => onMergeMeals(date, merged, ids)}
          />
        </>
      )}
    </div>
  );
}
