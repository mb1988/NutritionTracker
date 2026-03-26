import { z } from "zod";
import { dateStringSchema, nutritionInputSchema } from "@/server/contracts/common";

export const MEAL_CATEGORIES = ["Breakfast", "Lunch", "Dinner", "Snack", "Other"] as const;
export type MealCategory = typeof MEAL_CATEGORIES[number];

const categorySchema = z.enum(MEAL_CATEGORIES).nullable().optional();

export const createMealSchema = z.object({
  date:     dateStringSchema,
  name:     z.string().trim().min(1).max(120),
  category: categorySchema,
  ...nutritionInputSchema.shape,
});

export const updateMealSchema = z
  .object({
    name:     z.string().trim().min(1).max(120).optional(),
    category: categorySchema,
    ...nutritionInputSchema.partial().shape,
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: "At least one field must be provided",
  });

export const mealIdParamSchema = z.object({
  id: z.string().trim().min(1),
});
