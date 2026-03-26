import { NextRequest, NextResponse } from "next/server";
import { createMealSchema } from "@/server/contracts/meals";
import { createMeal } from "@/server/services/mealService";
import { getAuthenticatedUserId, handleApiError } from "@/server/http";

export async function POST(request: NextRequest) {
  try {
    const userId = await getAuthenticatedUserId();
    const body = await request.json();
    const parsed = createMealSchema.parse(body);
    const result = await createMeal(userId, parsed);
    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
