import { type Meal } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { ensureUserExists } from "@/server/services/dayService";

export type MealHistoryItem = Pick<
  Meal,
  | "id"
  | "name"
  | "category"
  | "calories"
  | "protein"
  | "carbs"
  | "fat"
  | "satFat"
  | "fibre"
  | "addedSugar"
  | "naturalSugar"
  | "salt"
  | "alcohol"
  | "omega3"
  | "createdAt"
> & {
  lastUsedDate: string;
};

function normalizeMealName(name: string) {
  return name.trim().toLowerCase().replace(/\s+/g, " ");
}

export async function searchMealHistory(
  userId: string,
  query: string,
  limit = 20,
): Promise<MealHistoryItem[]> {
  await ensureUserExists(userId);

  const trimmed = query.trim();
  const take = Math.min(Math.max(limit, 1), 50);

  const meals = await prisma.meal.findMany({
    where: {
      userId,
      ...(trimmed
        ? { name: { contains: trimmed, mode: "insensitive" } }
        : {}),
    },
    orderBy: { createdAt: "desc" },
    take: take * 4,
    include: {
      day: { select: { date: true } },
    },
  });

  const seen = new Set<string>();
  const results: MealHistoryItem[] = [];

  for (const meal of meals) {
    const key = normalizeMealName(meal.name);
    if (seen.has(key)) continue;
    seen.add(key);

    const { day, dayId: _dayId, userId: _userId, updatedAt: _updatedAt, ...rest } = meal;
    results.push({
      ...rest,
      lastUsedDate: day.date,
    });

    if (results.length >= take) break;
  }

  return results;
}
