import { z } from "zod";
import { dateStringSchema } from "@/server/contracts/common";

export const createDaySchema = z.object({
  date: dateStringSchema,
});

export const dayQuerySchema = z.object({
  date: dateStringSchema,
});

/** PATCH /api/days updates exactly one day-level field: steps or water. */
export const updateDaySchema = z.union([
  z.object({
    date:  dateStringSchema,
    steps: z.number().int().min(0).max(100000),
  }),
  z.object({
    date:    dateStringSchema,
    waterMl: z.number().int().min(0).max(20000),
  }),
]);
