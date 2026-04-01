import { NextRequest, NextResponse } from "next/server";
import { regenerateStepSyncSchema } from "@/server/contracts/stepSync";
import { disableStepSync, getStepSyncConfig, regenerateStepSyncToken } from "@/server/services/stepSyncService";
import { getSessionUserId, handleApiError } from "@/server/http";

export async function GET() {
  try {
    const userId = await getSessionUserId();
    const config = await getStepSyncConfig(userId);
    return NextResponse.json({ config }, { status: 200 });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const userId = await getSessionUserId();
    const body = await request.json().catch(() => ({}));
    const { provider } = regenerateStepSyncSchema.parse(body);
    const result = await regenerateStepSyncToken(userId, provider);
    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE() {
  try {
    const userId = await getSessionUserId();
    const config = await disableStepSync(userId);
    return NextResponse.json({ config }, { status: 200 });
  } catch (error) {
    return handleApiError(error);
  }
}

