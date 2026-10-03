import { prisma } from "@/lib/prisma";
import { DEFAULT_GOALS, type DailyGoals } from "@/app/types";
import { updateGoalsSchema } from "@/server/contracts/goals";

/**
 * Merges a stored goals JSON string over DEFAULT_GOALS. Missing, corrupt or
 * out-of-range stored values fall back to the defaults instead of erroring.
 */
export function parseStoredGoals(raw: string | null | undefined): DailyGoals {
  if (!raw) return { ...DEFAULT_GOALS };

  let stored: unknown;
  try {
    stored = JSON.parse(raw);
  } catch {
    return { ...DEFAULT_GOALS };
  }
  if (!stored || typeof stored !== "object") return { ...DEFAULT_GOALS };

  const goals: DailyGoals = { ...DEFAULT_GOALS };
  const shape = updateGoalsSchema.shape;
  for (const key of Object.keys(DEFAULT_GOALS) as (keyof DailyGoals)[]) {
    const parsed = shape[key].safeParse((stored as Record<string, unknown>)[key]);
    if (parsed.success && parsed.data !== undefined) {
      (goals as Record<keyof DailyGoals, number | boolean>)[key] = parsed.data;
    }
  }
  return goals;
}

export async function getGoals(userId: string): Promise<DailyGoals> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { goals: true },
  });
  return parseStoredGoals(user?.goals);
}

/** Validates and stores the goals; throws ZodError on an invalid payload. */
export async function saveGoals(userId: string, body: unknown): Promise<DailyGoals> {
  const goals = updateGoalsSchema.parse(body);
  await prisma.user.update({
    where: { id: userId },
    data: { goals: JSON.stringify(goals) },
  });
  return goals;
}
