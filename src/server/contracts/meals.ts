import { z } from "zod";
import { dateStringSchema, nutritionInputSchema } from "@/server/contracts/common";

export const createMealSchema = z.object({
  date: dateStringSchema,
  name: z.string().trim().min(1).max(120),
  ...nutritionInputSchema.shape,
});

// .partial() makes every nutrition field optional but preserves all validators
// (min(0), lt(10000)) — constraints still fire whenever a field IS present.
export const updateMealSchema = z
  .object({
    name: z.string().trim().min(1).max(120).optional(),
    ...nutritionInputSchema.partial().shape,
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: "At least one field must be provided",
  });

export const mealIdParamSchema = z.object({
  id: z.string().trim().min(1),
});
