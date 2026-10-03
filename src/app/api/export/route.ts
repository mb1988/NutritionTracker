import { NextResponse } from "next/server";
import { exportMealsCsv } from "@/server/services/exportService";
import { getSessionUserId, handleApiError } from "@/server/http";

/** GET /api/export — downloads every logged meal as CSV (signed-in users only). */
export async function GET() {
  try {
    const userId = await getSessionUserId();
    const csv = await exportMealsCsv(userId);
    const date = new Date().toISOString().slice(0, 10);

    return new NextResponse(csv, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="nutrition-export-${date}.csv"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}
