# Nutrition Tracker - Step 01 Backend

Backend foundation built with Next.js App Router, TypeScript, Prisma, PostgreSQL, and Zod.

## What is included

- Prisma models: `User`, `Day`, `Meal`, `SavedMeal`
- Service layer: `dayService`, `mealService`, `savedMealService`
- Transaction-safe meal mutations with day snapshot recalculation
- API routes required by Step 01
- Input validation with Zod
- Unit test for day totals recalculation helper

## Setup

1. Install dependencies
2. Configure environment variables
3. Generate Prisma client
4. Run migrations
5. Start the app

```bash
npm install
cp .env.example .env
npm run prisma:generate
npm run prisma:migrate
npm run dev
```

## API endpoints

- `POST /api/days`
- `GET /api/days?date=2026-03-26`
- `POST /api/meals`
- `PATCH /api/meals/:id`
- `DELETE /api/meals/:id`
- `POST /api/saved-meals`
- `GET /api/saved-meals`
- `POST /api/saved-meals/use`

All API requests require header: `x-user-id`.

## Notes

- Day totals are persisted snapshots and recalculated after every meal create/update/delete.
- Saved meals are templates and do not mutate historical meals.

## Run tests

```bash
npm run test
```

