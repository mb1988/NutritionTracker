import { NextRequest, NextResponse } from "next/server";
import { aiLogRequestSchema } from "@/server/contracts/aiLog";
import { estimateNutrition } from "@/server/services/aiLogService";
import { getAuthenticatedUserId, handleApiError } from "@/server/http";

export async function POST(request: NextRequest) {
  try {
    await getAuthenticatedUserId(); // auth gate — no DB write, just verify access
    const body = await request.json();
    const input = aiLogRequestSchema.parse(body);
    const result = await estimateNutrition(input);
    return NextResponse.json(result);
  } catch (error) {
    return handleApiError(error);
  }
}

