import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getServerSession } from "next-auth";
import { ZodError } from "zod";
import { AppError } from "@/server/errors";
import { authOptions } from "@/lib/auth";
import { DEMO_COOKIE, DEMO_USER_ID } from "@/lib/demo";

/**
 * Returns the authenticated DB user ID from the session,
 * or the demo user ID when the demo cookie is present.
 * Throws 401 if neither is available.
 */
export async function getAuthenticatedUserId(): Promise<string> {
  // Real session takes priority
  const session = await getServerSession(authOptions);
  if (session?.user?.id) {
    return session.user.id;
  }

  // Fall back to demo mode
  const cookieStore = await cookies();
  if (cookieStore.get(DEMO_COOKIE)?.value === "1") {
    return DEMO_USER_ID;
  }

  throw new AppError("Not authenticated", 401);
}

/** Requires a real signed-in account; demo users cannot access these routes. */
export async function getSessionUserId(): Promise<string> {
  const session = await getServerSession(authOptions);
  if (session?.user?.id) {
    return session.user.id;
  }

  throw new AppError("Sign in to use this feature", 401);
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
