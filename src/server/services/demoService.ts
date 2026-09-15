import { type Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { DEMO_USER_ID, DEMO_USER_EMAIL } from "@/lib/demo";
import {
  DEMO_SAVED_MEALS,
  buildDemoDataset,
  demoDateForOffset,
  demoDayTotals,
  demoMealTimestamp,
} from "@/lib/demoDataset";

/**
 * Rows per INSERT statement. Keeps each statement well inside Postgres'
 * 65 535 bind-parameter ceiling while still seeding ~5 000 meals in a handful
 * of round trips.
 */
const INSERT_CHUNK_SIZE = 400;

/** Deterministic ids so re-seeding the demo is idempotent. */
function demoDayId(date: string): string {
  return `demo-day-${date}`;
}

function demoMealId(date: string, index: number): string {
  return `demo-meal-${date}-${index + 1}`;
}

async function insertInChunks<T>(
  rows: readonly T[],
  insert: (chunk: T[]) => Promise<unknown>,
): Promise<void> {
  for (let index = 0; index < rows.length; index += INSERT_CHUNK_SIZE) {
    await insert(rows.slice(index, index + INSERT_CHUNK_SIZE));
  }
}

/**
 * Rebuilds the shared demo user's data from scratch.
 *
 * The dataset is generated relative to today (see `@/lib/demoDataset`), so the
 * demo always opens on a fully logged day, has over a year of history for the
 * trend views, and has data far into the future for anyone browsing forward
 * with the date picker.
 */
export async function resetDemoData(): Promise<void> {
  // 1. Ensure demo user exists
  await prisma.user.upsert({
    where: { id: DEMO_USER_ID },
    update: {},
    create: { id: DEMO_USER_ID, email: DEMO_USER_EMAIL, name: "Demo User" },
  });

  // 2. Wipe existing demo data
  await prisma.meal.deleteMany({ where: { userId: DEMO_USER_ID } });
  await prisma.day.deleteMany({ where: { userId: DEMO_USER_ID } });
  await prisma.savedMeal.deleteMany({ where: { userId: DEMO_USER_ID } });

  // 3. Build days + meals
  const dayRows: Prisma.DayCreateManyInput[] = [];
  const mealRows: Prisma.MealCreateManyInput[] = [];

  for (const day of buildDemoDataset()) {
    const date = demoDateForOffset(day.offset);
    const dayId = demoDayId(date);

    dayRows.push({
      id: dayId,
      userId: DEMO_USER_ID,
      date,
      totalSteps: day.steps,
      ...demoDayTotals(day.meals),
    });

    day.meals.forEach((meal, index) => {
      mealRows.push({
        id: demoMealId(date, index),
        userId: DEMO_USER_ID,
        dayId,
        ...meal,
        createdAt: demoMealTimestamp(date, index),
      });
    });
  }

  await insertInChunks(dayRows, (chunk) => prisma.day.createMany({ data: chunk }));
  await insertInChunks(mealRows, (chunk) => prisma.meal.createMany({ data: chunk }));

  // 4. Create saved meal templates
  await prisma.savedMeal.createMany({
    data: DEMO_SAVED_MEALS.map((meal, index) => ({
      id: `demo-saved-${index + 1}`,
      userId: DEMO_USER_ID,
      ...meal,
    })),
  });
}
