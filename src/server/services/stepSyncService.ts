import { createHash, randomBytes } from "node:crypto";
import { prisma } from "@/lib/prisma";
import { AppError } from "@/server/errors";
import { ensureUserExists, updateDaySteps } from "@/server/services/dayService";
import { type StepSyncProvider, type StepSyncConfig, type StepSyncIngestInput } from "@/server/contracts/stepSync";

const STEP_SYNC_WEBHOOK_PATH = "/api/steps/sync";

type StepSyncUserRecord = {
  stepSyncEnabled: boolean;
  stepSyncProvider: string | null;
  stepSyncTokenHash: string | null;
  stepSyncTokenLast4: string | null;
  stepSyncLastSyncedAt: Date | null;
};

export function createStepSyncToken(): string {
  return randomBytes(24).toString("base64url");
}

export function hashStepSyncToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export function buildTokenHint(last4: string | null): string | null {
  return last4 ? `••••${last4}` : null;
}

export function mapUserToStepSyncConfig(user: StepSyncUserRecord): StepSyncConfig {
  return {
    enabled: user.stepSyncEnabled && Boolean(user.stepSyncTokenHash),
    provider: isStepSyncProvider(user.stepSyncProvider) ? user.stepSyncProvider : null,
    tokenHint: buildTokenHint(user.stepSyncTokenLast4),
    lastSyncedAt: user.stepSyncLastSyncedAt?.toISOString() ?? null,
    webhookPath: STEP_SYNC_WEBHOOK_PATH,
    supportsDirectHealthAccess: false,
  };
}

export async function getStepSyncConfig(userId: string): Promise<StepSyncConfig> {
  await ensureUserExists(userId);

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      stepSyncEnabled: true,
      stepSyncProvider: true,
      stepSyncTokenHash: true,
      stepSyncTokenLast4: true,
      stepSyncLastSyncedAt: true,
    },
  });

  if (!user) {
    throw new AppError("User not found", 404);
  }

  return mapUserToStepSyncConfig(user);
}

export async function regenerateStepSyncToken(userId: string, provider: StepSyncProvider) {
  await ensureUserExists(userId);

  const token = createStepSyncToken();
  const tokenHash = hashStepSyncToken(token);
  const tokenLast4 = token.slice(-4);

  const user = await prisma.user.update({
    where: { id: userId },
    data: {
      stepSyncEnabled: true,
      stepSyncProvider: provider,
      stepSyncTokenHash: tokenHash,
      stepSyncTokenLast4: tokenLast4,
    },
    select: {
      stepSyncEnabled: true,
      stepSyncProvider: true,
      stepSyncTokenHash: true,
      stepSyncTokenLast4: true,
      stepSyncLastSyncedAt: true,
    },
  });

  return {
    config: mapUserToStepSyncConfig(user),
    token,
  };
}

export async function disableStepSync(userId: string): Promise<StepSyncConfig> {
  await ensureUserExists(userId);

  const user = await prisma.user.update({
    where: { id: userId },
    data: {
      stepSyncEnabled: false,
      stepSyncProvider: null,
      stepSyncTokenHash: null,
      stepSyncTokenLast4: null,
    },
    select: {
      stepSyncEnabled: true,
      stepSyncProvider: true,
      stepSyncTokenHash: true,
      stepSyncTokenLast4: true,
      stepSyncLastSyncedAt: true,
    },
  });

  return mapUserToStepSyncConfig(user);
}

export async function syncStepsWithToken(rawToken: string, input: StepSyncIngestInput) {
  const token = rawToken.trim();
  if (!token) {
    throw new AppError("Missing sync token", 401);
  }

  const tokenHash = hashStepSyncToken(token);
  const user = await prisma.user.findUnique({
    where: { stepSyncTokenHash: tokenHash },
    select: {
      id: true,
      stepSyncEnabled: true,
      stepSyncProvider: true,
    },
  });

  if (!user || !user.stepSyncEnabled) {
    throw new AppError("Invalid sync token", 401);
  }

  if (isStepSyncProvider(user.stepSyncProvider) && user.stepSyncProvider !== input.provider) {
    throw new AppError("Sync provider does not match this token", 400);
  }

  const syncedAt = new Date();
  await updateDaySteps(user.id, input.date, input.steps, {
    source: input.provider,
    syncedAt,
  });

  await prisma.user.update({
    where: { id: user.id },
    data: {
      stepSyncEnabled: true,
      stepSyncProvider: input.provider,
      stepSyncLastSyncedAt: syncedAt,
    },
  });

  return {
    ok: true as const,
    date: input.date,
    steps: input.steps,
    provider: input.provider,
    syncedAt: syncedAt.toISOString(),
  };
}

function isStepSyncProvider(value: string | null): value is StepSyncProvider {
  return value === "ios-shortcuts" || value === "android-health-connect";
}

