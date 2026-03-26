import { type NextAuthOptions } from "next-auth";
import GitHubProvider from "next-auth/providers/github";
import { prisma } from "@/lib/prisma";

export const authOptions: NextAuthOptions = {
  providers: [
    GitHubProvider({
      clientId:     process.env.GITHUB_ID!,
      clientSecret: process.env.GITHUB_CLIENT_SECRET!,
    }),
  ],

  session: { strategy: "jwt" },

  pages: {
    signIn:  "/login",
    error:   "/login",   // on error (e.g. access denied) send back to login
  },

  callbacks: {
    /**
     * Gate: only the GitHub username in ALLOWED_GITHUB_USERNAME can sign in.
     * Anyone else gets redirected back to /login with error=AccessDenied.
     */
    async signIn({ user, profile }) {
      const allowedUsername = process.env.ALLOWED_GITHUB_USERNAME;
      const githubLogin     = (profile as { login?: string } | undefined)?.login;

      // Block if the username doesn't match
      if (allowedUsername && githubLogin !== allowedUsername) {
        console.warn(`[auth] Blocked sign-in attempt from GitHub user: ${githubLogin}`);
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
