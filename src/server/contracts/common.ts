import { z } from "zod";

const round1dp = (v: number) => Math.round(v * 10) / 10;

export const nutritionInputSchema = z.object({
  calories:      z.number().min(0).lt(10000).transform(round1dp),
  protein:       z.number().min(0).transform(round1dp),
  carbs:         z.number().min(0).transform(round1dp),
  fat:           z.number().min(0).transform(round1dp),
  satFat:        z.number().min(0).transform(round1dp),
  fibre:         z.number().min(0).transform(round1dp),
  addedSugar:    z.number().min(0).transform(round1dp),
  naturalSugar:  z.number().min(0).transform(round1dp),
  salt:          z.number().min(0).transform(round1dp),
  alcohol:       z.number().min(0).default(0).transform(round1dp),
  omega3:        z.number().min(0).default(0).transform(round1dp),
});

// Date strings arrive as YYYY-MM-DD; validate shape without coercing to Date.
export const dateStringSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be YYYY-MM-DD");
