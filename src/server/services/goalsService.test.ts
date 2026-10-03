import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  findUniqueMock,
  updateMock,
  getServerSessionMock,
} = vi.hoisted(() => ({
  findUniqueMock: vi.fn(),
  updateMock: vi.fn(),
  getServerSessionMock: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: { user: { findUnique: findUniqueMock, update: updateMock } },
}));
vi.mock("next-auth", () => ({ getServerSession: getServerSessionMock }));
vi.mock("next/headers", () => ({ cookies: async () => ({ get: () => undefined }) }));
vi.mock("@/lib/auth", () => ({ authOptions: {} }));

import { NextRequest } from "next/server";
import { DEFAULT_GOALS } from "@/app/types";
import { GET, PATCH } from "@/app/api/user/goals/route";
import { getGoals, parseStoredGoals, saveGoals } from "@/server/services/goalsService";

function patchRequest(body: unknown) {
  return new NextRequest("http://localhost/api/user/goals", {
    method: "PATCH",
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json" },
  });
}

describe("goalsService", () => {
  beforeEach(() => {
    findUniqueMock.mockReset();
    updateMock.mockReset();
    getServerSessionMock.mockReset();
  });

  it("returns DEFAULT_GOALS when nothing is stored yet", async () => {
    findUniqueMock.mockResolvedValue({ goals: null });
    await expect(getGoals("user-1")).resolves.toEqual(DEFAULT_GOALS);
  });

  it("merges stored goals over DEFAULT_GOALS", async () => {
    findUniqueMock.mockResolvedValue({ goals: JSON.stringify({ calories: 1800, protein: 120 }) });
    await expect(getGoals("user-1")).resolves.toEqual({ ...DEFAULT_GOALS, calories: 1800, protein: 120 });
  });

  it("falls back to defaults for corrupt or invalid stored values", () => {
    expect(parseStoredGoals("{not json")).toEqual(DEFAULT_GOALS);
    expect(parseStoredGoals(JSON.stringify({ calories: -5, fibre: "lots", salt: 5 })))
      .toEqual({ ...DEFAULT_GOALS, salt: 5 });
  });

  it("persists goals and round-trips them", async () => {
    const goals = { ...DEFAULT_GOALS, calories: 2500, stepCalorieAdjustment: true };
    updateMock.mockResolvedValue({});

    await saveGoals("user-1", goals);
    const stored = updateMock.mock.calls[0][0].data.goals as string;
    expect(parseStoredGoals(stored)).toEqual(goals);
  });

  it("fills waterGoal for clients that predate it", async () => {
    const { waterGoal: _waterGoal, ...legacy } = DEFAULT_GOALS;
    updateMock.mockResolvedValue({});
    await expect(saveGoals("user-1", legacy)).resolves.toEqual(DEFAULT_GOALS);
  });

  describe("route", () => {
    it("GET returns 401 when not signed in", async () => {
      getServerSessionMock.mockResolvedValue(null);
      const res = await GET();
      expect(res.status).toBe(401);
    });

    it("GET returns the merged goals for the session user", async () => {
      getServerSessionMock.mockResolvedValue({ user: { id: "user-1" } });
      findUniqueMock.mockResolvedValue({ goals: JSON.stringify({ calories: 1900 }) });

      const res = await GET();
      expect(res.status).toBe(200);
      await expect(res.json()).resolves.toEqual({ ...DEFAULT_GOALS, calories: 1900 });
      expect(findUniqueMock).toHaveBeenCalledWith(expect.objectContaining({ where: { id: "user-1" } }));
    });

    it("PATCH rejects an invalid body with 400 and writes nothing", async () => {
      getServerSessionMock.mockResolvedValue({ user: { id: "user-1" } });

      const res = await PATCH(patchRequest({ ...DEFAULT_GOALS, calories: "lots" }));
      expect(res.status).toBe(400);
      expect(updateMock).not.toHaveBeenCalled();
    });

    it("PATCH returns 401 when not signed in", async () => {
      getServerSessionMock.mockResolvedValue(null);
      const res = await PATCH(patchRequest(DEFAULT_GOALS));
      expect(res.status).toBe(401);
    });

    it("PATCH stores valid goals", async () => {
      getServerSessionMock.mockResolvedValue({ user: { id: "user-1" } });
      updateMock.mockResolvedValue({});

      const res = await PATCH(patchRequest({ ...DEFAULT_GOALS, fibre: 35 }));
      expect(res.status).toBe(200);
      expect(updateMock).toHaveBeenCalledWith({
        where: { id: "user-1" },
        data: { goals: JSON.stringify({ ...DEFAULT_GOALS, fibre: 35 }) },
      });
    });
  });
});
