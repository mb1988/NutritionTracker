import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { DEFAULT_GOALS } from "@/app/types";
import { getSessionUserId, handleApiError } from "@/server/http";
import { updateGoalsSchema } from "@/server/contracts/goals";

export async function GET() {
  try {
    const userId = await getSessionUserId();
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { goals: true },
    });
    const saved = user?.goals ? (JSON.parse(user.goals) as object) : {};
    const goals = { ...DEFAULT_GOALS, ...saved };
    return NextResponse.json(goals);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const userId = await getSessionUserId();
    const body = await request.json();
    const goals = updateGoalsSchema.parse(body);
    await prisma.user.update({
      where: { id: userId },
      data: { goals: JSON.stringify(goals) },
    });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return handleApiError(error);
  }
}
