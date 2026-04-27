import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getAuthenticatedUserId, handleApiError } from "@/server/http";
import { searchMealHistory } from "@/server/services/mealHistoryService";

const querySchema = z.object({
  q: z.string().trim().max(120).default(""),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});

export async function GET(request: NextRequest) {
  try {
    const userId = await getAuthenticatedUserId();
    const parsed = querySchema.parse({
      q: request.nextUrl.searchParams.get("q") ?? "",
      limit: request.nextUrl.searchParams.get("limit") ?? undefined,
    });

    const meals = await searchMealHistory(userId, parsed.q, parsed.limit);
    return NextResponse.json({ meals }, { status: 200 });
  } catch (error) {
    return handleApiError(error);
  }
}
