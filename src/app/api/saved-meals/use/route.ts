import { NextRequest, NextResponse } from "next/server";
import { useSavedMealSchema } from "@/server/contracts/savedMeals";
import { useSavedMeal } from "@/server/services/savedMealService";
import { getUserIdFromRequest, handleApiError } from "@/server/http";

export async function POST(request: NextRequest) {
  try {
    const userId = getUserIdFromRequest(request);
    const body = await request.json();
    const parsed = useSavedMealSchema.parse(body);

    const result = await useSavedMeal(userId, parsed.savedMealId, parsed.date);
    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}

