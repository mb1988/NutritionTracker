export type LocalMeal = {
  id: string;
  date: string; // YYYY-MM-DD
  name: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  satFat: number;
  fibre: number;
  addedSugar: number;
  naturalSugar: number;
  salt: number;
  alcohol: number;
  omega3: number;
};

export type MealFormValues = Omit<LocalMeal, "id" | "date">;

export type DaySnapshot = {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  satFat: number;
  fibre: number;
  addedSugar: number;
  naturalSugar: number;
  salt: number;
  alcohol: number;
  omega3: number;
  steps?: number;
};

export type SavedMeal = {
  id: string;
  name: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  satFat: number;
  fibre: number;
  addedSugar: number;
  naturalSugar: number;
  salt: number;
  alcohol: number;
  omega3: number;
};

export type DailyGoals = {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fibre: number;
  salt: number;
};

export const DEFAULT_GOALS: DailyGoals = {
  calories: 2000,
  protein: 150,
  carbs: 200,
  fat: 65,
  fibre: 30,
  salt: 6,
};

export const EMPTY_FORM_VALUES: MealFormValues = {
  name: "",
  calories: 0,
  protein: 0,
  carbs: 0,
  fat: 0,
  satFat: 0,
  fibre: 0,
  addedSugar: 0,
  naturalSugar: 0,
  salt: 0,
  alcohol: 0,
  omega3: 0,
};

export const LS_KEY = "nutrition_tracker_meals";
export const LS_GOALS_KEY = "nutrition_tracker_goals";
export const LS_SAVED_MEALS_KEY = "nutrition_tracker_saved_meals";

/** Hardcoded for single-user dev mode. Replace with auth session in production. */
export const USER_ID = "cmn7km9hs0000cad8s6kslzcp";

