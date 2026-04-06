export type MacroValues = {
  calories:     number;
  protein:      number;
  carbs:        number;
  fat:          number;
  satFat:       number;
  fibre:        number;
  addedSugar:   number;
  naturalSugar: number;
  salt:         number;
  alcohol:      number;
  omega3:       number;
};

/** Zero-value accumulator — used as the reduce seed. */
export const ZERO_MACROS: Readonly<MacroValues> = Object.freeze({
  calories:     0,
  protein:      0,
  carbs:        0,
  fat:          0,
  satFat:       0,
  fibre:        0,
  addedSugar:   0,
  naturalSugar: 0,
  salt:         0,
  alcohol:      0,
  omega3:       0,
});

const r1 = (n: number) => Math.round(n * 10) / 10;

/**
 * Re-aggregates all nutrition fields from a list of meals.
 *
 * Always re-sums from source records rather than doing an incremental delta.
 * This prevents floating-point drift that would otherwise accumulate across
 * many concurrent create/update/delete operations.
 */
export function calculateDayTotals<T extends MacroValues>(meals: T[]): MacroValues {
  const raw = meals.reduce(
    (totals, meal) => ({
      calories:     totals.calories     + meal.calories,
      protein:      totals.protein      + meal.protein,
      carbs:        totals.carbs        + meal.carbs,
      fat:          totals.fat          + meal.fat,
      satFat:       totals.satFat       + meal.satFat,
      fibre:        totals.fibre        + meal.fibre,
      addedSugar:   totals.addedSugar   + meal.addedSugar,
      naturalSugar: totals.naturalSugar + meal.naturalSugar,
      salt:         totals.salt         + meal.salt,
      alcohol:      totals.alcohol      + meal.alcohol,
      omega3:       totals.omega3       + meal.omega3,
    }),
    { ...ZERO_MACROS },
  );
  return {
    calories:     r1(raw.calories),
    protein:      r1(raw.protein),
    carbs:        r1(raw.carbs),
    fat:          r1(raw.fat),
    satFat:       r1(raw.satFat),
    fibre:        r1(raw.fibre),
    addedSugar:   r1(raw.addedSugar),
    naturalSugar: r1(raw.naturalSugar),
    salt:         r1(raw.salt),
    alcohol:      r1(raw.alcohol),
    omega3:       r1(raw.omega3),
  };
}
