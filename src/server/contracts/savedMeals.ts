import { z } from "zod";
import { nutritionInputSchema } from "@/server/contracts/common";
import { MEAL_CATEGORIES } from "@/server/contracts/meals";

export const createSavedMealSchema = z.object({
  name:     z.string().trim().min(1).max(120),
  category: z.enum(MEAL_CATEGORIES).nullable().optional(),
  ...nutritionInputSchema.shape,
});

export const useSavedMealSchema = z.object({
  savedMealId: z.string().trim().min(1),
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be YYYY-MM-DD"),
});
