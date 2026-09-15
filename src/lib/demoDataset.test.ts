import { describe, expect, it } from "vitest";
import {
  DEMO_FUTURE_DAYS,
  DEMO_HISTORY_DAYS,
  buildDemoDataset,
  demoDateForOffset,
  demoDayTotals,
} from "@/lib/demoDataset";

const CATEGORIES = new Set(["Breakfast", "Lunch", "Dinner", "Snack", "Other"]);

describe("buildDemoDataset", () => {
  const dataset = buildDemoDataset();

  it("spans a year of history and two years into the future", () => {
    expect(dataset[0]?.offset).toBe(-DEMO_HISTORY_DAYS);
    expect(dataset[dataset.length - 1]?.offset).toBe(DEMO_FUTURE_DAYS);
    expect(dataset).toHaveLength(DEMO_HISTORY_DAYS + DEMO_FUTURE_DAYS + 1);
  });

  it("covers every calendar date exactly once, with no gaps", () => {
    const dates = dataset.map((day) => demoDateForOffset(day.offset));
    expect(new Set(dates).size).toBe(dates.length);

    for (let index = 1; index < dataset.length; index++) {
      const previous = dataset[index - 1];
      const current = dataset[index];
      expect(current.offset - previous.offset).toBe(1);
    }
  });

  it("includes today, and leaves today partially logged", () => {
    const today = dataset.find((day) => day.offset === 0);
    expect(today).toBeDefined();
    expect(today?.meals).toHaveLength(2);
  });

  it("has a plausible day of meals and steps for every date", () => {
    for (const day of dataset) {
      expect(day.meals.length).toBeGreaterThanOrEqual(2);
      expect(day.meals.length).toBeLessThanOrEqual(5);
      expect(day.steps).toBeGreaterThanOrEqual(1000);

      const totals = demoDayTotals(day.meals);
      expect(totals.totalCalories).toBeGreaterThan(800);
      expect(totals.totalCalories).toBeLessThan(4500);
      expect(totals.totalProtein).toBeGreaterThan(30);
      expect(totals.totalFibre).toBeGreaterThan(0);
    }
  });

  it("only uses the app's meal categories", () => {
    for (const day of dataset) {
      for (const meal of day.meals) {
        expect(CATEGORIES.has(meal.category ?? "")).toBe(true);
      }
    }
  });

  it("returns the same meals when called again", () => {
    const second = buildDemoDataset();
    expect(second).toEqual(dataset);
  });

  it("sums day totals from the meals it was given", () => {
    const totals = demoDayTotals([
      { name: "Test A", category: "Lunch", calories: 500, protein: 30, carbs: 40, fat: 20, satFat: 5, fibre: 4, addedSugar: 2, naturalSugar: 3, salt: 1, alcohol: 0, omega3: 100 },
      { name: "Test B", category: "Dinner", calories: 700, protein: 40, carbs: 60, fat: 30, satFat: 9, fibre: 6, addedSugar: 4, naturalSugar: 7, salt: 2, alcohol: 1.5, omega3: 200 },
    ]);

    expect(totals).toEqual({
      totalCalories: 1200,
      totalProtein: 70,
      totalCarbs: 100,
      totalFat: 50,
      totalSatFat: 14,
      totalFibre: 10,
      totalAddedSugar: 6,
      totalNaturalSugar: 10,
      totalSalt: 3,
      totalAlcohol: 1.5,
      totalOmega3: 300,
    });
  });
});
