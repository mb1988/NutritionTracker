import { NextRequest, NextResponse } from "next/server";
import { deleteSavedMeal } from "@/server/services/savedMealService";
import { getAuthenticatedUserId, handleApiError } from "@/server/http";

export async function DELETE(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const userId = await getAuthenticatedUserId();
    const { id } = await context.params;
    await deleteSavedMeal(userId, id);
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    return handleApiError(error);
  }
}

