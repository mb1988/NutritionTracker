import { NextRequest, NextResponse } from "next/server";
import { createDaySchema, dayQuerySchema } from "@/server/contracts/days";
import { getDayByDate, getOrCreateDay, getAllDays } from "@/server/services/dayService";
import { getUserIdFromRequest, handleApiError } from "@/server/http";

export async function POST(request: NextRequest) {
  try {
    const userId = getUserIdFromRequest(request);
    const body = await request.json();
    const { date } = createDaySchema.parse(body);

    const day = await getOrCreateDay(userId, date);
    return NextResponse.json({ day }, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function GET(request: NextRequest) {
  try {
    const userId = getUserIdFromRequest(request);
    const dateParam = request.nextUrl.searchParams.get("date");

    // No date = return ALL days for history view
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
