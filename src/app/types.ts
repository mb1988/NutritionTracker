export type LocalMeal = {
  id: string;
  date: string; // YYYY-MM-DD
  name: string;
  category: string | null;
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
  category: string | null;
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
  satFat: number;
  fibre: number;
  addedSugar: number;
  naturalSugar: number;
  salt: number;
  alcohol: number;
  omega3: number;
};

export type SelectableMetricKey = keyof DailyGoals;

export const NUTRITION_METRICS: Record<
  SelectableMetricKey,
  {
    label: string;
    shortLabel: string;
    unit: string;
    reverse: boolean;
    daySnapshotKey: keyof DaySnapshot;
    apiTotalKey: string;
  }
> = {
  calories: {
    label: "Calories",
    shortLabel: "Calories",
    unit: "kcal",
    reverse: false,
    daySnapshotKey: "calories",
    apiTotalKey: "totalCalories",
  },
  protein: {
    label: "Protein",
    shortLabel: "Protein",
    unit: "g",
    reverse: true,
    daySnapshotKey: "protein",
    apiTotalKey: "totalProtein",
  },
  carbs: {
    label: "Carbs",
    shortLabel: "Carbs",
    unit: "g",
    reverse: false,
    daySnapshotKey: "carbs",
    apiTotalKey: "totalCarbs",
  },
  fat: {
    label: "Total Fat",
    shortLabel: "Fat",
    unit: "g",
    reverse: false,
    daySnapshotKey: "fat",
    apiTotalKey: "totalFat",
  },
  satFat: {
    label: "Sat Fat",
    shortLabel: "Sat Fat",
    unit: "g",
    reverse: false,
    daySnapshotKey: "satFat",
    apiTotalKey: "totalSatFat",
  },
  fibre: {
    label: "Fibre",
    shortLabel: "Fibre",
    unit: "g",
    reverse: true,
    daySnapshotKey: "fibre",
    apiTotalKey: "totalFibre",
  },
  addedSugar: {
    label: "Added Sugar",
    shortLabel: "Sugar+",
    unit: "g",
    reverse: false,
    daySnapshotKey: "addedSugar",
    apiTotalKey: "totalAddedSugar",
  },
  naturalSugar: {
    label: "Natural Sugar",
    shortLabel: "Sugar",
    unit: "g",
    reverse: false,
    daySnapshotKey: "naturalSugar",
    apiTotalKey: "totalNaturalSugar",
  },
  salt: {
    label: "Salt",
    shortLabel: "Salt",
    unit: "g",
    reverse: false,
    daySnapshotKey: "salt",
    apiTotalKey: "totalSalt",
  },
  alcohol: {
    label: "Alcohol",
    shortLabel: "Alcohol",
    unit: "u",
    reverse: false,
    daySnapshotKey: "alcohol",
    apiTotalKey: "totalAlcohol",
  },
  omega3: {
    label: "Omega-3",
    shortLabel: "Omega-3",
    unit: "mg",
    reverse: true,
    daySnapshotKey: "omega3",
    apiTotalKey: "totalOmega3",
  },
};

export const DEFAULT_GOALS: DailyGoals = {
  calories: 2200,
  protein: 150,
  carbs: 200,
  fat: 65,
  satFat: 20,
  fibre: 30,
  addedSugar: 25,
  naturalSugar: 35,
  salt: 6,
  alcohol: 2,
  omega3: 250,
};

export const EMPTY_FORM_VALUES: MealFormValues = {
  name: "",
  category: null,
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

