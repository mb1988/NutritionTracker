import { type PrismaClient } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { AppError } from "@/server/errors";

// ── Types ─────────────────────────────────────────────────────

/** Prisma transaction client — the `tx` argument inside $transaction callbacks. */
export type Tx = Omit<
  PrismaClient,
  "$connect" | "$disconnect" | "$on" | "$transaction" | "$use" | "$extends"
>;

// ── Date validation ───────────────────────────────────────────

const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Validates a YYYY-MM-DD string is a real calendar date.
 * Catches both format violations AND impossible dates (e.g. 2026-02-30).
 * Throws AppError(400) on failure so callers get an immediate 400 without
 * opening a DB connection.
 */
export function validateDate(date: string): void {
  if (!DATE_REGEX.test(date)) {
    throw new AppError(`Invalid date format: "${date}". Expected YYYY-MM-DD.`, 400);
  }

  const [year, month, day] = date.split("-").map(Number);
  const d = new Date(Date.UTC(year, month - 1, day));

  if (
    d.getUTCFullYear() !== year ||
    d.getUTCMonth()    !== month - 1 ||
    d.getUTCDate()     !== day
  ) {
    throw new AppError(`Invalid calendar date: "${date}".`, 400);
  }
}

// ── User ──────────────────────────────────────────────────────

/**
 * Idempotent upsert for the user row.
 * In production this is replaced by auth middleware; kept here for the
 * dev x-user-id header flow.
 */
export async function ensureUserExists(userId: string): Promise<void> {
  await prisma.user.upsert({
    where:  { id: userId },
    update: {},
    create: { id: userId },
  });
}

// ── Day ───────────────────────────────────────────────────────

/**
 * Transaction-aware get-or-create for Day.
 * Call this inside a Prisma $transaction callback.
 */
export async function getOrCreateDayTx(tx: Tx, userId: string, date: string) {
  return tx.day.upsert({
    where:  { userId_date: { userId, date } },
    update: {},
    create: { userId, date },
  });
}

/** Standalone get-or-create with its own connection (outside a transaction). */
export async function getOrCreateDay(userId: string, date: string) {
  validateDate(date);

  return prisma.day.upsert({
    where:  { userId_date: { userId, date } },
    update: {},
    create: { userId, date },
    include: { meals: { orderBy: { createdAt: "asc" } } },
  });
}

/** Returns null when the day doesn't exist yet. */
export async function getDayByDate(userId: string, date: string) {
  return prisma.day.findUnique({
    where: { userId_date: { userId, date } },
    include: { meals: { orderBy: { createdAt: "asc" } } },
  });
}

/** Updates (or creates) the steps count for a day. */
export async function updateDaySteps(userId: string, date: string, steps: number) {
  validateDate(date);
  return prisma.day.upsert({
    where:  { userId_date: { userId, date } },
    update: { totalSteps: steps },
    create: { userId, date, totalSteps: steps },
    include: { meals: { orderBy: { createdAt: "asc" } } },
  });
}

/** Returns all days for a user, ordered newest first (no meals included). */
export async function getAllDays(userId: string) {
  return prisma.day.findMany({
    where: { userId },
    orderBy: { date: "desc" },
    include: { meals: { orderBy: { createdAt: "asc" } } },
  });
}

