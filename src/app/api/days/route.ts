import { NextRequest, NextResponse } from "next/server";
import { gzipSync } from "node:zlib";
import { z } from "zod";
import { createDaySchema, dayQuerySchema } from "@/server/contracts/days";
import { getDayByDate, getOrCreateDay, getAllDays, updateDaySteps } from "@/server/services/dayService";
import { getAuthenticatedUserId, handleApiError } from "@/server/http";

/** Bodies above this size are worth compressing. */
const COMPRESS_THRESHOLD_BYTES = 1024;

/**
 * JSON response that gzips itself when the client asks for it.
 *
 * The all-days payload carries every logged meal, which reaches multiple
 * megabytes once a user (or the demo user) has years of history.
 */
function jsonResponse(body: unknown, request: NextRequest) {
  const payload = JSON.stringify(body);
  const acceptsGzip = request.headers.get("accept-encoding")?.includes("gzip") ?? false;

  if (!acceptsGzip || payload.length < COMPRESS_THRESHOLD_BYTES) {
    return new NextResponse(payload, {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }

  return new NextResponse(new Uint8Array(gzipSync(payload)), {
    status: 200,
    headers: {
      "Content-Type": "application/json",
      "Content-Encoding": "gzip",
      Vary: "Accept-Encoding",
    },
  });
}

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
      return jsonResponse({ days }, request);
    }

    const { date } = dayQuerySchema.parse({ date: dateParam });
    const day = await getDayByDate(userId, date);
    return jsonResponse({ day: day ?? null }, request);
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


