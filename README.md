# Nutrition Tracker

An authenticated nutrition tracking app built with Next.js App Router, TypeScript, Prisma, PostgreSQL, NextAuth, and Zod.

The app lets a signed-in user log meals, track daily nutrition targets, store reusable meal templates, review recent trends, and browse historical days.

## Current features

- GitHub sign-in with route protection via NextAuth middleware
- Per-user nutrition history stored in PostgreSQL
- Daily meal logging with create, edit, and delete flows
- Daily totals for calories, protein, carbs, fat, sat fat, fibre, sugars, salt, alcohol, omega-3, and steps
- Customisable daily goals stored locally in the browser
- Saved meal templates, with one-time localStorage migration into the database
- 7-day metric selector and chart for quick trend review
- History view with per-day scoring and drill-down into logged meals

## Stack

- Next.js 15 App Router
- React 19
- TypeScript
- Prisma + PostgreSQL
- NextAuth GitHub provider
- Zod validation
- Vitest for service tests

## Data model

Prisma currently models:

- `User`
- `Day`
- `Meal`
- `SavedMeal`

`Day` stores persisted snapshot totals, and those totals are recalculated whenever meals are created, updated, or deleted.

## Authentication

- Sign-in happens through GitHub
- All app routes are protected except `/login`, `/api/auth/*`, and Next.js static assets
- Data is scoped to the authenticated user

The login page and auth config live in:

- `src/app/login/page.tsx`
- `src/lib/auth.ts`
- `src/middleware.ts`

## Environment variables

At minimum, configure:

```bash
DATABASE_URL=
GITHUB_ID=
GITHUB_CLIENT_SECRET=
ALLOWED_GITHUB_USERNAME=
NEXTAUTH_SECRET=
NEXTAUTH_URL=
```

Notes:

- `ALLOWED_GITHUB_USERNAME` is used to restrict access to a single GitHub account
- `NEXTAUTH_SECRET` and `NEXTAUTH_URL` are standard NextAuth runtime settings

## Local development

1. Install dependencies
2. Create your local env file
3. Generate the Prisma client
4. Run migrations
5. Start the app

```bash
npm install
cp .env.example .env
npm run prisma:generate
npm run prisma:migrate
npm run dev
```

Open `http://localhost:3000` and sign in with the allowed GitHub account.

## Available scripts

```bash
npm run dev
npm run build
npm run start
npm run typecheck
npm run test
npm run prisma:generate
npm run prisma:migrate
npm run prisma:studio
```

## Optional seed data

The repo includes a Prisma seed script:

```bash
npx prisma db seed
```

This is mainly useful for local development. The current seed creates a sample user, a sample day, sample meals, and one saved meal template.

## API surface

Main app routes currently include:

- `GET /api/days`
- `GET /api/days?date=YYYY-MM-DD`
- `POST /api/days`
- `PATCH /api/days`
- `POST /api/meals`
- `PATCH /api/meals/:id`
- `DELETE /api/meals/:id`
- `GET /api/saved-meals`
- `POST /api/saved-meals`
- `DELETE /api/saved-meals/:id`
- `POST /api/saved-meals/use`

These routes use the authenticated session; they do not rely on the old `x-user-id` header flow documented in earlier versions of the project.

## Deployment

`railway.toml` is configured for Railway with:

- Prisma client generation during build
- `prisma migrate deploy` during build
- `next build` for the production bundle
- `npm start -- -p $PORT` as the start command

## Testing

```bash
npm run typecheck
npm run test
```

## Notes on legacy utilities

The repo still contains some one-off migration/bootstrap helpers under `prisma/` such as `migrate-user-data.ts` and `migrate-historical.js`. They are not part of the standard runtime or deployment flow and should be treated as manual maintenance scripts.

