import { Prisma, type Day, type Meal } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { AppError } from "@/server/errors";
import { type MacroValues, calculateDayTotals } from "@/server/services/calculations";
import {
  type Tx,
  validateDate,
  ensureUserExists,
  getOrCreateDayTx,
} from "@/server/services/dayService";

// ── Types ─────────────────────────────────────────────────────

export type NutritionFields = MacroValues;

export type CreateMealInput = NutritionFields & {
  /** Calendar date in YYYY-MM-DD format. */
  date: string;
  name: string;
  category?: string | null;
};

export type UpdateMealInput = Partial<Omit<CreateMealInput, "date">>;

// ── Transaction config ────────────────────────────────────────

/**
 * Serializable isolation is required here.
 *
 * The recalculation pattern is: read all meals → sum → write Day totals.
 * Without Serializable, a concurrent INSERT between our read and write
 * would cause a phantom read and produce incorrect totals.
 */
const TX_OPTIONS = {
  isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
} as const;

/** Max retry attempts on a Serializable conflict (Prisma P2034 / PG code 40001). */
const SERIALIZABLE_RETRY_LIMIT = 3;

// ── Retry wrapper ─────────────────────────────────────────────

/**
 * Retries `fn` when Postgres raises a serialization failure (P2034).
 * All other errors — including AppError — are rethrown immediately.
 */
async function withSerializableRetry<T>(
  fn: () => Promise<T>,
  attempt = 0,
): Promise<T> {
  try {
    return await fn();
  } catch (err) {
    const isRetryable =
      err instanceof Prisma.PrismaClientKnownRequestError &&
      err.code === "P2034" &&
      attempt < SERIALIZABLE_RETRY_LIMIT;

    if (!isRetryable) throw err;

    console.warn(
      `[mealService] Serializable conflict — retrying (attempt ${attempt + 1}/${SERIALIZABLE_RETRY_LIMIT})`,
    );
    return withSerializableRetry(fn, attempt + 1);
  }
}

// ── Internal helpers ──────────────────────────────────────────

const MEAL_MACRO_SELECT = {
  calories:     true,
  protein:      true,
  carbs:        true,
  fat:          true,
  satFat:       true,
  fibre:        true,
  addedSugar:   true,
  naturalSugar: true,
  salt:         true,
  alcohol:      true,
  omega3:       true,
} as const;

/**
 * Re-fetches every meal for the day and writes the Day totals snapshot.
 *
 * Re-aggregates from source records on every call — never uses an incremental
 * delta — to prevent floating-point drift across concurrent mutations.
 * Returns ZERO_MACROS when the day has no remaining meals (e.g. after last delete).
 */
async function recalculateDayTotalsTx(tx: Tx, dayId: string): Promise<Day> {
  const meals = await tx.meal.findMany({
    where:  { dayId },
    select: MEAL_MACRO_SELECT,
  });

  // calculateDayTotals returns ZERO_MACROS when meals array is empty.
  const t = calculateDayTotals(meals);

  return tx.day.update({
    where: { id: dayId },
    data: {
      totalCalories:     t.calories,
      totalProtein:      t.protein,
      totalCarbs:        t.carbs,
      totalFat:          t.fat,
      totalSatFat:       t.satFat,
      totalFibre:        t.fibre,
      totalAddedSugar:   t.addedSugar,
      totalNaturalSugar: t.naturalSugar,
      totalSalt:         t.salt,
      totalAlcohol:      t.alcohol,
      totalOmega3:       t.omega3,
    },
  });
}

// ── Public API ────────────────────────────────────────────────

/**
 * Creates a meal and atomically updates the parent Day's totals snapshot.
 *
 * Flow:
 *   1. Validate date (fail fast — no DB I/O on bad input)
 *   2. Ensure user row exists (idempotent upsert, outside tx)
 *   3. Open Serializable transaction (with retry on conflict):
 *      a. Get or create the Day for (userId, date)
 *      b. Insert the Meal
 *      c. Re-fetch all meals for the day
 *      d. Recalculate and persist Day totals
 *   4. Return { meal, day }
 */
export async function createMeal(
  userId: string,
  input: CreateMealInput,
): Promise<{ meal: Meal; day: Day }> {
  // Step 1 — validate before touching the DB
  validateDate(input.date);

  // Step 2 — ensure user row (outside tx to avoid Serializable contention
  // on the users table; replaced by real auth middleware in production)
  await ensureUserExists(userId);

  console.log(`[createMeal] userId=${userId} date=${input.date} meal="${input.name}"`);

  return withSerializableRetry(() =>
    prisma.$transaction(async (tx) => {
      // 3a — find or create the Day
      const day = await getOrCreateDayTx(tx, userId, input.date);

      // 3b — insert the Meal
      const meal = await tx.meal.create({
        data: {
          userId,
          dayId:        day.id,
          name:         input.name,
          category:     input.category ?? null,
          calories:     input.calories,
          protein:      input.protein,
          carbs:        input.carbs,
          fat:          input.fat,
          satFat:       input.satFat,
          fibre:        input.fibre,
          addedSugar:   input.addedSugar,
          naturalSugar: input.naturalSugar,
          salt:         input.salt,
          alcohol:      input.alcohol,
          omega3:       input.omega3,
        },
      });

      // 3c+d — re-aggregate and persist Day totals
      const updatedDay = await recalculateDayTotalsTx(tx, day.id);

      console.log(`[createMeal] created meal=${meal.id} → day=${day.id}`);
      return { meal, day: updatedDay };
    }, TX_OPTIONS),
  );
}

export async function updateMeal(
  userId: string,
  mealId: string,
  input: UpdateMealInput,
): Promise<{ meal: Meal; day: Day }> {
  // No ensureUserExists — if the user doesn't exist the meal won't exist either.
  // The findFirst below is the only DB guard needed.
  console.log(`[updateMeal] userId=${userId} mealId=${mealId}`);

  return withSerializableRetry(() =>
    prisma.$transaction(async (tx) => {
      const meal = await tx.meal.findFirst({ where: { id: mealId, userId } });
      if (!meal) throw new AppError("Meal not found", 404);

      const updatedMeal = await tx.meal.update({
        where: { id: meal.id },
        data: {
          ...(input.name         !== undefined && { name:         input.name }),
          ...(input.category     !== undefined && { category:     input.category }),
          ...(input.calories     !== undefined && { calories:     input.calories }),
          ...(input.protein      !== undefined && { protein:      input.protein }),
          ...(input.carbs        !== undefined && { carbs:        input.carbs }),
          ...(input.fat          !== undefined && { fat:          input.fat }),
          ...(input.satFat       !== undefined && { satFat:       input.satFat }),
          ...(input.fibre        !== undefined && { fibre:        input.fibre }),
          ...(input.addedSugar   !== undefined && { addedSugar:   input.addedSugar }),
          ...(input.naturalSugar !== undefined && { naturalSugar: input.naturalSugar }),
          ...(input.salt         !== undefined && { salt:         input.salt }),
          ...(input.alcohol      !== undefined && { alcohol:      input.alcohol }),
          ...(input.omega3       !== undefined && { omega3:       input.omega3 }),
        },
      });

      const updatedDay = await recalculateDayTotalsTx(tx, meal.dayId);
      console.log(`[updateMeal] updated meal=${updatedMeal.id} → day=${meal.dayId}`);
      return { meal: updatedMeal, day: updatedDay };
    }, TX_OPTIONS),
  );
}

export async function deleteMeal(
  userId: string,
  mealId: string,
): Promise<{ deletedMealId: string; day: Day }> {
  // No ensureUserExists — ownership is enforced by the userId guard on findFirst.
  console.log(`[deleteMeal] userId=${userId} mealId=${mealId}`);

  return withSerializableRetry(() =>
    prisma.$transaction(async (tx) => {
      const meal = await tx.meal.findFirst({ where: { id: mealId, userId } });
      if (!meal) throw new AppError("Meal not found", 404);

      await tx.meal.delete({ where: { id: meal.id } });
      const updatedDay = await recalculateDayTotalsTx(tx, meal.dayId);

      console.log(`[deleteMeal] deleted meal=${meal.id} → day=${meal.dayId}`);
      return { deletedMealId: meal.id, day: updatedDay };
    }, TX_OPTIONS),
  );
}
