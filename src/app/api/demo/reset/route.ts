import { NextRequest, NextResponse } from "next/server";
import { resetDemoData } from "@/server/services/demoService";
import { checkRateLimit, clientIp } from "@/lib/rateLimit";
import { handleApiError } from "@/server/http";

/**
 * Public (pre-auth) endpoint: rebuilding the demo rewrites thousands of rows,
 * so each client IP gets a handful of resets per minute.
 */
export async function POST(request: NextRequest) {
  try {
    await checkRateLimit(`ip:${clientIp(request.headers)}:demo-reset`, 5, 60_000);
    await resetDemoData();
    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (error) {
    return handleApiError(error);
  }
}
