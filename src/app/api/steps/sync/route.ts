import { NextRequest, NextResponse } from "next/server";
import { stepSyncIngestSchema } from "@/server/contracts/stepSync";
import { handleApiError } from "@/server/http";
import { syncStepsWithToken } from "@/server/services/stepSyncService";

function extractSyncToken(request: NextRequest): string {
  const authHeader = request.headers.get("authorization")?.trim();
  if (authHeader?.toLowerCase().startsWith("bearer ")) {
	return authHeader.slice(7).trim();
  }

  return (
	request.headers.get("x-step-sync-token")?.trim() ??
	request.nextUrl.searchParams.get("token")?.trim() ??
	""
  );
}

export async function POST(request: NextRequest) {
  try {
	const token = extractSyncToken(request);
	const body = await request.json();
	const input = stepSyncIngestSchema.parse(body);
	const result = await syncStepsWithToken(token, input);
	return NextResponse.json(result, { status: 200 });
  } catch (error) {
	return handleApiError(error);
  }
}

