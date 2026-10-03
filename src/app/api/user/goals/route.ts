import { NextRequest, NextResponse } from "next/server";
import { getSessionUserId, handleApiError } from "@/server/http";
import { getGoals, saveGoals } from "@/server/services/goalsService";

export async function GET() {
  try {
    const userId = await getSessionUserId();
    return NextResponse.json(await getGoals(userId));
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const userId = await getSessionUserId();
    const goals = await saveGoals(userId, await request.json());
    return NextResponse.json({ ok: true, goals });
  } catch (error) {
    return handleApiError(error);
  }
}
