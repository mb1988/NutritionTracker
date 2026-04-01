import { getToken } from "next-auth/jwt";
import { NextRequest, NextResponse } from "next/server";
import { DEMO_COOKIE } from "@/lib/demo";

export async function middleware(req: NextRequest) {
  // Demo mode — cookie gets you past auth
  if (req.cookies.get(DEMO_COOKIE)?.value === "1") {
    return NextResponse.next();
  }

  // Otherwise require a valid NextAuth JWT
  const token = await getToken({ req });
  if (!token) {
    const loginUrl = new URL("/login", req.url);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

/**
 * Protect every route except:
 *  - /login          (the sign-in page itself)
 *  - /api/auth/*     (NextAuth callbacks & CSRF)
 *  - /api/demo/*     (demo setup — must be reachable pre-auth)
 *  - /api/steps/sync (token-authenticated webhook for phone step sync)
 *  - /_next/*        (Next.js static files)
 *  - /favicon.ico
 */
export const config = {
  matcher: ["/((?!login|api/auth|api/demo|api/steps/sync|_next/static|_next/image|favicon.ico).*)"],
};

