import { NextRequest, NextResponse } from "next/server";
import { mealIdParamSchema, updateMealSchema } from "@/server/contracts/meals";
import { deleteMeal, updateMeal } from "@/server/services/mealService";
import { getAuthenticatedUserId, handleApiError } from "@/server/http";

export async function PATCH(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const userId = await getAuthenticatedUserId();
    const params = mealIdParamSchema.parse(await context.params);
    const body = await request.json();
    const parsed = updateMealSchema.parse(body);

    const result = await updateMeal(userId, params.id, parsed);
    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const userId = await getAuthenticatedUserId();
    const params = mealIdParamSchema.parse(await context.params);

    const result = await deleteMeal(userId, params.id);
    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    return handleApiError(error);
  }
}
