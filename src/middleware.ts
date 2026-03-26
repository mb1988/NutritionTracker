export { default } from "next-auth/middleware";

/**
 * Protect every route except:
 *  - /login          (the sign-in page itself)
 *  - /api/auth/*     (NextAuth callbacks & CSRF)
 *  - /_next/*        (Next.js static files)
 *  - /favicon.ico
 */
export const config = {
  matcher: ["/((?!login|api/auth|_next/static|_next/image|favicon.ico).*)"],
};

