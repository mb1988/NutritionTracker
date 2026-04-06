import { NextRequest, NextResponse } from "next/server";
import { aiLogRequestSchema } from "@/server/contracts/aiLog";
import { estimateNutrition } from "@/server/services/aiLogService";
import { getAuthenticatedUserId, handleApiError } from "@/server/http";
import { checkRateLimit } from "@/lib/rateLimit";

export async function POST(request: NextRequest) {
  try {
    const userId = await getAuthenticatedUserId(); // auth gate — no DB write, just verify access
    checkRateLimit(userId, 15, 60_000);
    const body = await request.json();
    const input = aiLogRequestSchema.parse(body);
    const result = await estimateNutrition(input);
    return NextResponse.json(result);
  } catch (error) {
    return handleApiError(error);
  }
}

