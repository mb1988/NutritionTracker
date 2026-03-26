import { NextRequest, NextResponse } from "next/server";
import { ZodError } from "zod";
import { AppError } from "@/server/errors";

export function getUserIdFromRequest(request: NextRequest): string {
  const userId = request.headers.get("x-user-id");
  if (!userId) {
    throw new AppError("Missing x-user-id header", 401);
  }
  return userId;
}

export function handleApiError(error: unknown): NextResponse {
  if (error instanceof ZodError) {
    return NextResponse.json(
      { error: "Validation error", details: error.flatten() },
      { status: 400 },
    );
  }

  if (error instanceof AppError) {
    return NextResponse.json({ error: error.message }, { status: error.status });
  }

  console.error(error);
  return NextResponse.json({ error: "Internal server error" }, { status: 500 });
}

