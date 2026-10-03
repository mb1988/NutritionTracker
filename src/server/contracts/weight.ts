import { z } from "zod";
import { dateStringSchema } from "@/server/contracts/common";

export const upsertWeightSchema = z.object({
  date:     dateStringSchema,
  weightKg: z.number().finite().min(20).max(400).transform((v) => Math.round(v * 10) / 10),
});

export const weightDateQuerySchema = z.object({
  date: dateStringSchema,
});
