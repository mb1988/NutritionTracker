import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  prismaUserFindUniqueMock,
  prismaUserUpdateMock,
  ensureUserExistsMock,
  updateDayStepsMock,
} = vi.hoisted(() => ({
  prismaUserFindUniqueMock: vi.fn(),
  prismaUserUpdateMock: vi.fn(),
  ensureUserExistsMock: vi.fn(),
  updateDayStepsMock: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: {
      findUnique: prismaUserFindUniqueMock,
      update: prismaUserUpdateMock,
    },
  },
}));

vi.mock("@/server/services/dayService", () => ({
  ensureUserExists: ensureUserExistsMock,
  updateDaySteps: updateDayStepsMock,
}));

import {
  buildTokenHint,
  createStepSyncToken,
  hashStepSyncToken,
  mapUserToStepSyncConfig,
  syncStepsWithToken,
} from "@/server/services/stepSyncService";

describe("stepSyncService", () => {
  beforeEach(() => {
    vi.useRealTimers();
    prismaUserFindUniqueMock.mockReset();
    prismaUserUpdateMock.mockReset();
    ensureUserExistsMock.mockReset();
    updateDayStepsMock.mockReset();
  });

  it("creates URL-safe sync tokens", () => {
    const token = createStepSyncToken();
    expect(token.length).toBeGreaterThanOrEqual(24);
    expect(token).toMatch(/^[A-Za-z0-9_-]+$/);
  });

  it("builds a token hint from the last 4 characters", () => {
    expect(buildTokenHint("abcd")).toBe("••••abcd");
    expect(buildTokenHint(null)).toBeNull();
  });

  it("maps stored user sync state into API config", () => {
    expect(mapUserToStepSyncConfig({
      stepSyncEnabled: true,
      stepSyncProvider: "ios-shortcuts",
      stepSyncTokenHash: "hashed-token",
      stepSyncTokenLast4: "1a2b",
      stepSyncLastSyncedAt: new Date("2026-04-01T08:30:00.000Z"),
    })).toEqual({
      enabled: true,
      provider: "ios-shortcuts",
      tokenHint: "••••1a2b",
      lastSyncedAt: "2026-04-01T08:30:00.000Z",
      webhookPath: "/api/steps/sync",
      supportsDirectHealthAccess: false,
    });
  });

  it("rejects missing sync tokens", async () => {
    await expect(syncStepsWithToken("   ", {
      date: "2026-04-01",
      steps: 9000,
      provider: "ios-shortcuts",
    })).rejects.toMatchObject({
      message: "Missing sync token",
      status: 401,
    });
  });

  it("accepts a valid iPhone sync payload and writes steps to the matching day", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-04-01T10:15:00.000Z"));

    prismaUserFindUniqueMock.mockResolvedValue({
      id: "user-1",
      stepSyncEnabled: true,
      stepSyncProvider: "ios-shortcuts",
    });
    updateDayStepsMock.mockResolvedValue({ id: "day-1" });
    prismaUserUpdateMock.mockResolvedValue({ id: "user-1" });

    const result = await syncStepsWithToken(" secret-token ", {
      date: "2026-04-01",
      steps: 12345,
      provider: "ios-shortcuts",
    });

    const syncedAt = new Date("2026-04-01T10:15:00.000Z");

    expect(prismaUserFindUniqueMock).toHaveBeenCalledWith({
      where: { stepSyncTokenHash: hashStepSyncToken("secret-token") },
      select: {
        id: true,
        stepSyncEnabled: true,
        stepSyncProvider: true,
      },
    });
    expect(updateDayStepsMock).toHaveBeenCalledWith("user-1", "2026-04-01", 12345, {
      source: "ios-shortcuts",
      syncedAt,
    });
    expect(prismaUserUpdateMock).toHaveBeenCalledWith({
      where: { id: "user-1" },
      data: {
        stepSyncEnabled: true,
        stepSyncProvider: "ios-shortcuts",
        stepSyncLastSyncedAt: syncedAt,
      },
    });
    expect(result).toEqual({
      ok: true,
      date: "2026-04-01",
      steps: 12345,
      provider: "ios-shortcuts",
      syncedAt: "2026-04-01T10:15:00.000Z",
    });
  });

  it("rejects provider mismatches for an existing token", async () => {
    prismaUserFindUniqueMock.mockResolvedValue({
      id: "user-1",
      stepSyncEnabled: true,
      stepSyncProvider: "ios-shortcuts",
    });

    await expect(syncStepsWithToken("secret-token", {
      date: "2026-04-01",
      steps: 8000,
      provider: "android-health-connect",
    })).rejects.toMatchObject({
      message: "Sync provider does not match this token",
      status: 400,
    });
  });
});

