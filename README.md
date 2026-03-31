# Nutrition Tracker

A personal, single-user nutrition tracking web app built with Next.js 15 App Router, TypeScript, Prisma, PostgreSQL, NextAuth (GitHub), and Zod.

Designed to make it fast and low-friction to log everything you eat, monitor macro and micronutrient targets, review recent trends, and build up a library of meals you eat regularly.

---

## Features

### Daily Logging
- Log meals with calories, protein, carbs, fat, sat fat, fibre, added sugar, natural sugar, salt, alcohol, and omega-3
- Edit and delete individual meals
- Navigate between days with a date picker
- Daily totals and per-macro progress bars update in real time

### Saved Meals
- Save any meal as a reusable template
- Quickly add a saved meal to the current day from a picker
- Manage (rename, delete) saved meals from a dedicated panel

### Goals
- Customisable daily targets for each tracked nutrient, stored per-user in the database
- Visual progress indicators show how close you are to each goal

### Trends & History
- Configurable metric selector covering any tracked nutrient plus steps
- Weekly bar chart with support for **daily**, **7-day rolling average**, and **monthly average** views
- Time period switcher (Last 7 days / Last 30 days / Last 90 days)
- History list of past days with a per-day score and drill-down into logged meals

### Auth & Access Control
- GitHub OAuth sign-in via NextAuth
- All routes protected by middleware — only the configured GitHub username can access the app
- Data is fully scoped to the authenticated user

---

## Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 15 App Router |
| Language | TypeScript |
| UI | React 19, Recharts |
| ORM | Prisma |
| Database | PostgreSQL |
| Auth | NextAuth v4 (GitHub provider) |
| Validation | Zod |
| Testing | Vitest |
| Deployment | Railway |

---

## Data Model

```
User
 └─ Day            (one per calendar date; stores recalculated snapshot totals)
     └─ Meal       (individual food entries)
 └─ SavedMeal      (reusable meal templates)
 └─ UserProfile    (daily nutrition goals)
```

`Day` totals are recalculated server-side whenever a meal is created, updated, or deleted.

---

## Environment Variables

```bash
DATABASE_URL=
GITHUB_ID=
GITHUB_CLIENT_SECRET=
ALLOWED_GITHUB_USERNAME=
NEXTAUTH_SECRET=
NEXTAUTH_URL=
```

| Variable | Purpose |
|---|---|
| `DATABASE_URL` | Postgres connection string |
| `GITHUB_ID` | GitHub OAuth App client ID |
| `GITHUB_CLIENT_SECRET` | GitHub OAuth App client secret |
| `ALLOWED_GITHUB_USERNAME` | Restricts access to a single GitHub account |
| `NEXTAUTH_SECRET` | Secret used to sign NextAuth session tokens |
| `NEXTAUTH_URL` | Full public URL of the app (e.g. `https://yourapp.up.railway.app`) |

---

## Local Development

```bash
npm install
cp .env.example .env          # fill in your values
npm run prisma:generate
npm run prisma:migrate
npm run dev
```

Open `http://localhost:3000` and sign in with the allowed GitHub account.

### Optional seed data

```bash
npx prisma db seed
```

Creates a sample user, day, meals, and a saved meal template — useful for a quick local smoke-test.

---

## Scripts

```bash
npm run dev              # start dev server
npm run build            # production build
npm run start            # start production server
npm run typecheck        # TypeScript check (no emit)
npm run test             # run Vitest unit tests
npm run prisma:generate  # generate Prisma client
npm run prisma:migrate   # run pending migrations (dev)
npm run prisma:studio    # open Prisma Studio
```

---

## API Routes

All routes require an active session. Data is scoped to the authenticated user.

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/days` | List days (optional `?date=YYYY-MM-DD` for a single day) |
| `POST` | `/api/days` | Upsert a day record |
| `PATCH` | `/api/days` | Update day-level fields (e.g. steps) |
| `POST` | `/api/meals` | Create a meal and recalculate day totals |
| `PATCH` | `/api/meals/:id` | Update a meal and recalculate day totals |
| `DELETE` | `/api/meals/:id` | Delete a meal and recalculate day totals |
| `GET` | `/api/saved-meals` | List saved meal templates |
| `POST` | `/api/saved-meals` | Create a saved meal template |
| `DELETE` | `/api/saved-meals/:id` | Delete a saved meal template |
| `POST` | `/api/saved-meals/use` | Add a saved meal to a specific day |

---

## Deployment

Configured for [Railway](https://railway.app) via `railway.toml`:

- Prisma client generation + `prisma migrate deploy` run during build
- `next build` produces the production bundle
- `npm start -- -p $PORT` starts the server

Provision a PostgreSQL plugin in Railway, set the environment variables, and deploy.

---

## Testing

```bash
npm run typecheck   # catch type errors
npm run test        # unit tests (calculations.test.ts)
```

