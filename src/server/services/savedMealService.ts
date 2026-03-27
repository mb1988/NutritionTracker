import { prisma } from "@/lib/prisma";
import { AppError } from "@/server/errors";
import { createMeal } from "@/server/services/mealService";
import { ensureUserExists } from "@/server/services/dayService";

type SavedMealInput = {
  name: string;
  category?: string | null;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  satFat: number;
  fibre: number;
  addedSugar: number;
  naturalSugar: number;
  salt: number;
  alcohol?: number;
  omega3?: number;
};

export async function createSavedMeal(userId: string, input: SavedMealInput) {
  await ensureUserExists(userId);

  return prisma.savedMeal.create({
    data: {
      userId,
      ...input,
    },
  });
}

export async function listSavedMeals(userId: string) {
  await ensureUserExists(userId);

  return prisma.savedMeal.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
  });
}

export async function deleteSavedMeal(userId: string, savedMealId: string) {
  await ensureUserExists(userId);

  const existing = await prisma.savedMeal.findFirst({
    where: {
      id: savedMealId,
      userId,
    },
  });

  if (!existing) {
    throw new AppError("Saved meal not found", 404);
  }

  await prisma.savedMeal.delete({
    where: { id: savedMealId },
  });
}

export async function useSavedMeal(userId: string, savedMealId: string, date: string) {
  await ensureUserExists(userId);

  const savedMeal = await prisma.savedMeal.findFirst({
    where: {
      id: savedMealId,
      userId,
    },
  });

  if (!savedMeal) {
    throw new AppError("Saved meal not found", 404);
  }

  return createMeal(userId, {
    date,
    name: savedMeal.name,
    category: savedMeal.category as string | null | undefined,
    calories: savedMeal.calories,
    protein: savedMeal.protein,
    carbs: savedMeal.carbs,
    fat: savedMeal.fat,
    satFat: savedMeal.satFat,
    fibre: savedMeal.fibre,
    addedSugar: savedMeal.addedSugar,
    naturalSugar: savedMeal.naturalSugar,
    salt: savedMeal.salt,
    alcohol: savedMeal.alcohol,
    omega3: savedMeal.omega3,
  });
}
