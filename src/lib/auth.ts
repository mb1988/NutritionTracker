import { type NextAuthOptions } from "next-auth";
import { type Provider } from "next-auth/providers/index";
import GitHubProvider from "next-auth/providers/github";
import GoogleProvider from "next-auth/providers/google";
import { prisma } from "@/lib/prisma";

/** Only offer the sign-in options whose credentials are configured. */
function configuredProviders(): Provider[] {
  const providers: Provider[] = [];

  if (process.env.GITHUB_ID && process.env.GITHUB_CLIENT_SECRET) {
    providers.push(GitHubProvider({
      clientId:     process.env.GITHUB_ID,
      clientSecret: process.env.GITHUB_CLIENT_SECRET,
    }));
  }

  if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
    providers.push(GoogleProvider({
      clientId:     process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    }));
  }

  return providers;
}

type SignInProfile = { login?: string; email?: string; email_verified?: boolean } | undefined;

/**
 * Applies the per-provider allowlist. An unset allowlist variable means that
 * provider is open to any account.
 */
export function isSignInAllowed(provider: string | undefined, profile: SignInProfile): boolean {
  if (provider === "github") {
    const allowedUsername = process.env.ALLOWED_GITHUB_USERNAME;
    return !allowedUsername || profile?.login === allowedUsername;
  }

  if (provider === "google") {
    // Never trust an unverified Google email for an allowlist match.
    if (profile?.email_verified === false) return false;
    const allowedEmail = process.env.ALLOWED_GOOGLE_EMAIL?.trim().toLowerCase();
    return !allowedEmail || profile?.email?.toLowerCase() === allowedEmail;
  }

  return false;
}

export const authOptions: NextAuthOptions = {
  providers: configuredProviders(),

  session: { strategy: "jwt" },

  pages: {
    signIn:  "/login",
    error:   "/login",   // on error (e.g. access denied) send back to login
  },

  callbacks: {
    /**
     * Gate: only the accounts in ALLOWED_GITHUB_USERNAME / ALLOWED_GOOGLE_EMAIL
     * can sign in. Anyone else gets redirected back to /login with
     * error=AccessDenied.
     */
    async signIn({ user, account, profile }) {
      if (!isSignInAllowed(account?.provider, profile as SignInProfile)) {
        console.warn(`[auth] Blocked ${account?.provider ?? "unknown"} sign-in attempt`);
        return false;
      }

      if (!user.email) return false;

      await prisma.user.upsert({
        where:  { email: user.email },
        update: { name: user.name ?? undefined, image: user.image ?? undefined },
        create: { email: user.email, name: user.name, image: user.image },
      });

      return true;
    },

    /** Store DB user ID in the JWT on first sign-in. */
    async jwt({ token, user }) {
      if (user?.email) {
        const dbUser = await prisma.user.findUnique({
          where:  { email: user.email },
          select: { id: true },
        });
        if (dbUser) token.dbUserId = dbUser.id;
      }
      return token;
    },

    /** Expose DB user ID on the session object. */
    async session({ session, token }) {
      if (token.dbUserId) {
        session.user.id = token.dbUserId as string;
      }
      return session;
    },
  },
};
