import { NextRequest, NextResponse } from "next/server";
import { upsertWeightSchema, weightDateQuerySchema } from "@/server/contracts/weight";
import { deleteWeightEntry, listWeightEntries, upsertWeightEntry } from "@/server/services/weightService";
import { getAuthenticatedUserId, handleApiError } from "@/server/http";

/** GET /api/weight?today=YYYY-MM-DD — the client sends its local date. */
export async function GET(request: NextRequest) {
  try {
    const userId = await getAuthenticatedUserId();
    const { date: today } = weightDateQuerySchema.parse({
      date: request.nextUrl.searchParams.get("today") ?? new Date().toISOString().slice(0, 10),
    });
    const entries = await listWeightEntries(userId, today);
    return NextResponse.json({ entries });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const userId = await getAuthenticatedUserId();
    const { date, weightKg } = upsertWeightSchema.parse(await request.json());
    const entry = await upsertWeightEntry(userId, date, weightKg);
    return NextResponse.json({ entry }, { status: 200 });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const userId = await getAuthenticatedUserId();
    const { date } = weightDateQuerySchema.parse({ date: request.nextUrl.searchParams.get("date") });
    await deleteWeightEntry(userId, date);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return handleApiError(error);
  }
}
