import { prisma } from "@/lib/prisma";
import { ensureUserExists, validateDate } from "@/server/services/dayService";
import { subtractDays, type WeightEntryDto } from "@/lib/weightTrend";

export type { WeightEntryDto };

/** How much weight history the panel loads. */
export const WEIGHT_HISTORY_DAYS = 90;

/** Entries from the last WEIGHT_HISTORY_DAYS days up to `today`, newest first. */
export async function listWeightEntries(userId: string, today: string): Promise<WeightEntryDto[]> {
  validateDate(today);

  return prisma.weightEntry.findMany({
    where: {
      userId,
      date: { gte: subtractDays(today, WEIGHT_HISTORY_DAYS), lte: today },
    },
    orderBy: { date: "desc" },
    select: { date: true, weightKg: true },
  });
}

export async function upsertWeightEntry(userId: string, date: string, weightKg: number): Promise<WeightEntryDto> {
  validateDate(date);
  await ensureUserExists(userId);

  return prisma.weightEntry.upsert({
    where:  { userId_date: { userId, date } },
    update: { weightKg },
    create: { userId, date, weightKg },
    select: { date: true, weightKg: true },
  });
}

export async function deleteWeightEntry(userId: string, date: string): Promise<void> {
  validateDate(date);
  await prisma.weightEntry.deleteMany({ where: { userId, date } });
}
