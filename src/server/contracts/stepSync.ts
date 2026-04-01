import { z } from "zod";
import { dateStringSchema } from "@/server/contracts/common";

export const STEP_SYNC_PROVIDERS = ["ios-shortcuts", "android-health-connect"] as const;
export type StepSyncProvider = typeof STEP_SYNC_PROVIDERS[number];

export const stepSyncProviderSchema = z.enum(STEP_SYNC_PROVIDERS);

export const stepSyncConfigSchema = z.object({
  enabled: z.boolean(),
  provider: stepSyncProviderSchema.nullable(),
  tokenHint: z.string().nullable(),
  lastSyncedAt: z.string().datetime().nullable(),
  webhookPath: z.string().min(1),
  supportsDirectHealthAccess: z.literal(false),
});

export const regenerateStepSyncSchema = z.object({
  provider: stepSyncProviderSchema.default("ios-shortcuts"),
});

export const regenerateStepSyncResponseSchema = z.object({
  config: stepSyncConfigSchema,
  token: z.string().min(24),
});

export const stepSyncIngestSchema = z.object({
  date: dateStringSchema,
  steps: z.number().int().min(0).max(100000),
  provider: stepSyncProviderSchema.default("ios-shortcuts"),
});

export const stepSyncIngestResponseSchema = z.object({
  ok: z.literal(true),
  date: dateStringSchema,
  steps: z.number().int().min(0).max(100000),
  provider: stepSyncProviderSchema,
  syncedAt: z.string().datetime(),
});

export type StepSyncConfig = z.infer<typeof stepSyncConfigSchema>;
export type StepSyncIngestInput = z.infer<typeof stepSyncIngestSchema>;

