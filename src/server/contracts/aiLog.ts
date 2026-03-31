import { z } from "zod";

// ── Request ───────────────────────────────────────────────────
export const aiLogRequestSchema = z.object({
  description: z.string().trim().min(2).max(1000),
});

// ── AI response shape — matches MealFormValues exactly ────────
export const aiLogResponseSchema = z.object({
  name:         z.string().min(1).max(120),
  category:     z.enum(["Breakfast", "Lunch", "Dinner", "Snack", "Other"]).nullable(),
  calories:     z.number().min(0).max(9999),
  protein:      z.number().min(0),
  carbs:        z.number().min(0),
  fat:          z.number().min(0),
  satFat:       z.number().min(0),
  fibre:        z.number().min(0),
  addedSugar:   z.number().min(0),
  naturalSugar: z.number().min(0),
  salt:         z.number().min(0),
  alcohol:      z.number().min(0),
  omega3:       z.number().min(0),
});

export type AiLogRequest  = z.infer<typeof aiLogRequestSchema>;
export type AiLogResponse = z.infer<typeof aiLogResponseSchema>;

