# NutritionTracker

Daily nutrition tracking web app: log meals (11 nutrients), goals vs NHS-style targets, history, trends, barcode scan (Open Food Facts), AI meal autofill, optional phone step sync. Single-user (GitHub sign-in restricted to one allowed username) plus a no-sign-up demo mode.
Stack: Next.js 15 (App Router), React 19, TypeScript, Prisma 6 + PostgreSQL, NextAuth v4 (GitHub), OpenAI SDK, Recharts, zod, Vitest.
Deployed on Railway (Nixpacks; see `railway.toml`). The URL in README.md is stale/404; the real one is in the Railway dashboard.

## Start here
- `README.md` = features + env vars. `tasks/BACKLOG.md` = numbered implementation tasks (done ones are marked); pick work from there. No CI workflows and no AGENTS.md.

## Commands (from package.json)
- `npm install`; `npm run dev` (next dev); `npm run build`; `npm start`
- `npm run typecheck` (tsc --noEmit); `npm test` (vitest run; tests live in `src/**/*.test.ts`)
- No lint script exists. Prisma: `npm run prisma:generate`, `npm run prisma:migrate` (migrate dev), `npm run prisma:studio`
- Setup: `cp .env.example .env`, fill values, then generate + migrate (see README)
- Deploy: push to the branch Railway watches. Build = `npx prisma generate && npm run build`; pre-deploy runs `node tasks/railway-migrate.js` (retries migrations).

## Layout
- `src/app/page.tsx` main UI (Today/History/Trends); `src/app/components/` UI parts; `src/app/hooks/` (e.g. useGoals)
- `src/app/api/` route handlers: ai-log, days, meals, saved-meals, food-suggestions, steps, step-sync, user, auth, demo
- `src/server/services/` business logic + tests (aiLogService, calculations); `src/server/contracts/` zod request schemas; `src/server/http.ts`, `errors.ts`
- `src/lib/` auth.ts, prisma.ts, rateLimit.ts, demo.ts + demoDataset.ts (demo data)
- `src/middleware.ts` route protection; `prisma/schema.prisma`, `prisma/migrations/`, `prisma/seed.ts`
- `tasks/railway-migrate.js` deploy-time migration runner; `railway.toml` deploy config

## Hard rules / gotchas
- Never open or print `.env` / `.env.local`; env var names are in `.env.example` (DATABASE_URL, GITHUB_ID, GITHUB_CLIENT_SECRET, ALLOWED_GITHUB_USERNAME, NEXTAUTH_SECRET, NEXTAUTH_URL, plus OPENAI_API_KEY / OPENAI_MODEL per README).
- Validate API input with the zod contracts in `src/server/contracts/`; keep logic in services, routes thin.
- Demo users have no DB persistence (localStorage only); skip API calls for them.
- Schema changes need a Prisma migration committed, since production applies them at deploy.
- Ignore generated dirs: `.next/`, `node_modules/`, `tsconfig.tsbuildinfo`, `.claude/worktrees/`.

## Working style
- Be token-thrifty: read only the files you need, avoid whole-repo exploration, prefer targeted greps; run only the relevant tests.
- Do not commit or push unless asked.
