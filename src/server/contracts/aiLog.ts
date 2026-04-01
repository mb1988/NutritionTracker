import { z } from "zod";

// ── Request ───────────────────────────────────────────────────
export const aiModelTierSchema = z.enum(["balanced", "accurate"]);

const amountSchema = z.coerce.number().positive().max(5000);

const describeRequestSchema = z.object({
  mode: z.literal("describe"),
  description: z.string().trim().min(2).max(1000),
  modelTier: aiModelTierSchema.default("accurate"),
});

const barcodeRequestSchema = z.object({
  mode: z.literal("barcode"),
  barcode: z.string().trim().regex(/^\d{8,14}$/),
  amount: amountSchema.optional(),
  modelTier: aiModelTierSchema.default("accurate"),
});

const productSearchRequestSchema = z.object({
  mode: z.literal("productSearch"),
  query: z.string().trim().min(2).max(120),
  amount: amountSchema.optional(),
  modelTier: aiModelTierSchema.default("accurate"),
});

export const aiLogRequestSchema = z.preprocess((raw) => {
  if (raw && typeof raw === "object" && !Array.isArray(raw)) {
    const value = raw as Record<string, unknown>;
    if (!value.mode && typeof value.description === "string") {
      return { ...value, mode: "describe" };
    }
  }
  return raw;
}, z.discriminatedUnion("mode", [
  describeRequestSchema,
  barcodeRequestSchema,
  productSearchRequestSchema,
]));

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
export type AiModelTier = z.infer<typeof aiModelTierSchema>;

