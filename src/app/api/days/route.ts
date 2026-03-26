import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createDaySchema, dayQuerySchema } from "@/server/contracts/days";
import { getDayByDate, getOrCreateDay, getAllDays, updateDaySteps } from "@/server/services/dayService";
import { getAuthenticatedUserId, handleApiError } from "@/server/http";

const updateStepsSchema = z.object({
  date:  z.string(),
  steps: z.number().int().min(0).max(100000),
});

export async function POST(request: NextRequest) {
  try {
    const userId = await getAuthenticatedUserId();
    const body   = await request.json();
    const { date } = createDaySchema.parse(body);
    const day = await getOrCreateDay(userId, date);
    return NextResponse.json({ day }, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function GET(request: NextRequest) {
  try {
    const userId    = await getAuthenticatedUserId();
    const dateParam = request.nextUrl.searchParams.get("date");

    if (!dateParam) {
      const days = await getAllDays(userId);
      return NextResponse.json({ days }, { status: 200 });
    }

    const { date } = dayQuerySchema.parse({ date: dateParam });
    const day = await getDayByDate(userId, date);
    return NextResponse.json({ day: day ?? null }, { status: 200 });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const userId          = await getAuthenticatedUserId();
    const body            = await request.json();
    const { date, steps } = updateStepsSchema.parse(body);
    const day             = await updateDaySteps(userId, date, steps);
    return NextResponse.json({ day }, { status: 200 });
  } catch (error) {
    return handleApiError(error);
  }
}
