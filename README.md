# Nutrition Tracker

A full-featured daily nutrition tracking web app built with **Next.js 15**, **TypeScript**, **Prisma**, **PostgreSQL**, and **NextAuth**. Track every meal, monitor macro and micronutrient targets against NHS guidelines, review trends over time, and build a library of meals you eat regularly.

**[Live Demo →](https://nutritiontracker-production.up.railway.app)**  
Try it instantly — no sign-up required. Demo mode provides full functionality with sample data.

---

## Features

### Daily Logging
- Log meals with 11 tracked nutrients: calories, protein, carbs, fat, sat fat, fibre, added sugar, natural sugar, salt, alcohol, and omega-3
- Per-meal **health-coloured badges** (green / orange / red) based on NHS reference intake guidelines
- Edit and delete individual meals inline
- Track daily steps
- Collapsible "Log meal" form and "Meals logged" list for a clean interface
- Navigate between days with arrow buttons or a calendar date picker

### Saved Meal Templates
- Save any meal as a reusable template
- Quickly add a saved meal to the current day from a dropdown picker
- Delete saved templates you no longer need

### Goals
- Customisable daily targets for every tracked nutrient, stored per-user in the database
- Visual progress bars with colour-coded status (good / approaching / over)
- Edit goals from both Today and History views

### Trend Analysis
- Configurable metric selector covering all tracked nutrients plus steps
- Interactive bar chart with daily values and goal reference line
- Period-averaged trend cards with direction indicators
- Time period switcher: 1 week · 1 month · 3 months · 6 months
- Data coverage notice when you have fewer logged days than the selected period

### History
- Browse all logged days with at-a-glance summaries (calories, P/C/F, score)
- Mini progress bars on each day card for the top 5 macros
- Drill into any day to see the **identical** progress view as Today (same DayTotals component)
- Full meal editing, adding, and deleting from the history detail view
- Day-to-day navigation with arrows and calendar picker

### Demo Mode
- Anonymous demo experience — no login required
- Full feature parity: log meals, edit goals, browse history, view trends
- One-click data reset to restore sample data
- Ideal for showcasing the app on a portfolio or résumé

### Auth & Access Control
- GitHub OAuth sign-in via NextAuth
- All API routes protected by middleware
- Data fully scoped to the authenticated user
- Demo users get an isolated sandbox with their own data

---

## Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 15 App Router |
| Language | TypeScript (strict) |
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
     └─ Meal       (individual food entries with 11 nutrient fields)
 └─ SavedMeal      (reusable meal templates)
 └─ UserProfile    (daily nutrition goals per nutrient)
```

`Day` totals are recalculated server-side whenever a meal is created, updated, or deleted — the client never computes aggregates.

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
| `ALLOWED_GITHUB_USERNAME` | Restricts authenticated access to a single GitHub account |
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

Open `http://localhost:3000`. You can sign in with GitHub or use demo mode without authentication.

### Seed data

```bash
npx prisma db seed
```

Creates a sample user with several days of meals — useful for a quick local smoke-test.

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

All routes require an active session or a valid demo cookie. Data is scoped to the authenticated user.

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
| `POST` | `/api/demo/reset` | Reset demo user data to sample defaults |

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
