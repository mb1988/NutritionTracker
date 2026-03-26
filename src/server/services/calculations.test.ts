import { describe, expect, it } from "vitest";
import { calculateDayTotals, ZERO_MACROS } from "@/server/services/calculations";

describe("calculateDayTotals", () => {
  it("returns zero macros when there are no meals", () => {
    expect(calculateDayTotals([])).toEqual(ZERO_MACROS);
  });

  it("sums all nutrition fields correctly", () => {
    const result = calculateDayTotals([
      { calories: 550, protein: 35, carbs: 45, fat: 23, satFat: 8,  fibre: 5, addedSugar: 4,  naturalSugar: 6,  salt: 0.8 },
      { calories: 450, protein: 25, carbs: 40, fat: 17, satFat: 5,  fibre: 3, addedSugar: 2,  naturalSugar: 8,  salt: 0.6 },
    ]);

    expect(result).toEqual({
      calories:     1000,
      protein:      60,
      carbs:        85,
      fat:          40,
      satFat:       13,
      fibre:        8,
      addedSugar:   6,
      naturalSugar: 14,
      salt:         1.4,
    });
  });

  it("is not sensitive to floating-point order (re-aggregates each call)", () => {
    const meal = { calories: 100, protein: 10, carbs: 10, fat: 5, satFat: 2, fibre: 1, addedSugar: 1, naturalSugar: 1, salt: 0.1 };
    const a = calculateDayTotals([meal, meal]);
    const b = calculateDayTotals([meal, meal, meal]);
    expect(b.calories).toBe(300);
    expect(a.calories).toBe(200);
  });
});
