import { z } from "zod";
import { DEFAULT_GOALS } from "@/app/types";

const numericGoalKeys = Object.keys(DEFAULT_GOALS).filter(
  (key) => typeof DEFAULT_GOALS[key as keyof typeof DEFAULT_GOALS] === "number",
) as (keyof typeof DEFAULT_GOALS)[];

export const updateGoalsSchema = z.object(
  Object.fromEntries(
    numericGoalKeys.map((key) => [
      key,
      z.number().finite().min(0).max(100000),
    ]),
  ) as Record<keyof typeof DEFAULT_GOALS, z.ZodNumber>,
).extend({
  stepCalorieAdjustment: z.boolean().default(DEFAULT_GOALS.stepCalorieAdjustment),
});
