import { z } from "zod";
import { dateStringSchema } from "@/server/contracts/common";

export const createDaySchema = z.object({
  date: dateStringSchema,
});

export const dayQuerySchema = z.object({
  date: dateStringSchema,
});
