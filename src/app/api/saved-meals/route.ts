import { NextRequest, NextResponse } from "next/server";
import { createSavedMealSchema } from "@/server/contracts/savedMeals";
import { createSavedMeal, listSavedMeals } from "@/server/services/savedMealService";
import { getAuthenticatedUserId, handleApiError } from "@/server/http";

export async function POST(request: NextRequest) {
  try {
    const userId = await getAuthenticatedUserId();
    const body = await request.json();
    const parsed = createSavedMealSchema.parse(body);

    const savedMeal = await createSavedMeal(userId, parsed);
    return NextResponse.json({ savedMeal }, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function GET(request: NextRequest) {
  try {
    const userId = await getAuthenticatedUserId();
    const savedMeals = await listSavedMeals(userId);

    return NextResponse.json({ savedMeals }, { status: 200 });
  } catch (error) {
    return handleApiError(error);
  }
}
