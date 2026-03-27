import { z } from "zod";

export const nutritionInputSchema = z.object({
  calories:      z.number().min(0).lt(10000),
  protein:       z.number().min(0),
  carbs:         z.number().min(0),
  fat:           z.number().min(0),
  satFat:        z.number().min(0),
  fibre:         z.number().min(0),
  addedSugar:    z.number().min(0),
  naturalSugar:  z.number().min(0),
  salt:          z.number().min(0),
  alcohol:       z.number().min(0).default(0),
  omega3:        z.number().min(0).default(0),
});

// Date strings arrive as YYYY-MM-DD; validate shape without coercing to Date.
export const dateStringSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be YYYY-MM-DD");
