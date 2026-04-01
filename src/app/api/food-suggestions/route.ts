import { NextRequest, NextResponse } from "next/server";
import { foodSuggestionRequestSchema } from "@/server/contracts/foodSuggestions";
import { generateFoodSuggestions } from "@/server/services/foodSuggestionService";
import { getAuthenticatedUserId, handleApiError } from "@/server/http";

export async function POST(request: NextRequest) {
  try {
    await getAuthenticatedUserId();
    const body = await request.json();
    const input = foodSuggestionRequestSchema.parse(body);
    const result = await generateFoodSuggestions(input);
    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    return handleApiError(error);
  }
}

