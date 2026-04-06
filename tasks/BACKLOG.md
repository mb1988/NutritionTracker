# Implementation Backlog

Each task is self-contained. Tell me "implement task N" and I will do the full implementation.
Tasks are ordered: bugs first, then features by value/effort ratio.

---

## ✅ TASK 1 — Persist goals server-side *(done)*

**Problem:** `useGoals` stores goals in `localStorage` only. Goals are lost on a different device or after clearing browser storage.

**What to build:**
- Add a `goals` JSON column (`String?`) to the `User` model in `prisma/schema.prisma`
- Create a new Prisma migration
- Create `src/app/api/user/goals/route.ts` with:
  - `GET` → returns the stored goals JSON merged with `DEFAULT_GOALS` as fallback
  - `PATCH` → saves the goals JSON for the authenticated user
- Update `src/app/hooks/useGoals.ts`:
  - On mount: fetch `/api/user/goals` and use that value; fall back to `localStorage` only while the request is in flight (for perceived speed), then discard the `localStorage` copy once the server responds
  - On save: call `PATCH /api/user/goals` AND keep `localStorage` as an offline cache
  - Demo users: continue using `localStorage` only (check session status, skip API call for demo)
- No changes needed to `GoalsPanel` — the `onSave` callback interface stays the same

**Files touched:**
- `prisma/schema.prisma`
- `prisma/migrations/` (new migration via `prisma migrate dev`)
- `src/app/api/user/goals/route.ts` (new file)
- `src/app/hooks/useGoals.ts`

---

## ✅ TASK 2 — Day score uses user's goals, not hardcoded numbers *(done)*

**Problem:** `getDayScore` in `src/app/page.tsx` uses hardcoded values (calories ≤ 2200, fibre ≥ 25, etc.) regardless of what the user set in their goals.

**What to build:**
- Change `getDayScore(day: ApiDay)` signature to `getDayScore(day: ApiDay, goals: DailyGoals)`
- Replace the five hardcoded comparisons with the equivalent `goals.*` values
- Pass `goals` from the component that calls `getDayScore` (it already has access to the `goals` object from `useGoals`)
- Update `DayCard` to also accept and forward `goals`

**Files touched:**
- `src/app/page.tsx`

---

## ✅ TASK 3 — Remove dead code: `inferCategoryFromText` (Cleanup) *(done)*

**Problem:** `inferCategoryFromText` in `aiLogService.ts` is no longer called anywhere after the category fix. Dead code adds noise.

**What to build:**
- Delete the `inferCategoryFromText` function from `src/server/services/aiLogService.ts`
- Verify no other callers exist (there are none)

**Files touched:**
- `src/server/services/aiLogService.ts`

---

## ✅ TASK 4 — Rate limiting on AI endpoints (Security) *(done)*

**Problem:** `/api/ai-log` and `/api/food-suggestions` call OpenAI on every request with no throttle. A user can trigger unlimited calls and run up a bill.

**What to build:**
- Create `src/lib/rateLimit.ts` — a simple in-memory store using a `Map<string, { count: number; resetAt: number }>`:
  - `checkRateLimit(userId: string, limit: number, windowMs: number): void` — throws `AppError(429)` if the user exceeds `limit` requests within `windowMs`
  - Window resets per user after `windowMs` ms
- Apply to `/api/ai-log/route.ts`: limit 15 req / 60s per user
- Apply to `/api/food-suggestions/route.ts`: limit 10 req / 60s per user
- Demo user shares one bucket (use `DEMO_USER_ID` as the key)
- Note: in-memory resets on server restart; acceptable for this scale. If Railway ever runs multiple instances, a note to switch to Redis should be added as a comment.

**Files touched:**
- `src/lib/rateLimit.ts` (new file)
- `src/app/api/ai-log/route.ts`
- `src/app/api/food-suggestions/route.ts`

---

## ✅ TASK 5 — PWA manifest (Low effort, high value) *(done)*

**Problem:** The app is used daily on mobile but has no web app manifest. Users cannot install it to their homescreen without jumping through hoops.

**What to build:**
- Create `public/manifest.json` with: `name`, `short_name` ("NutriTrack"), `start_url` ("/"), `display` ("standalone"), `background_color`, `theme_color` (use the app's dark green: `#1a1c1a`), `icons` array pointing to a 192×192 and 512×512 PNG — add placeholder PNGs at those paths or reference the existing favicon
- Add `<link rel="manifest" href="/manifest.json" />` and `<meta name="theme-color" content="#1a1c1a" />` in `src/app/layout.tsx`
- Add `<meta name="apple-mobile-web-app-capable" content="yes" />` and `<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />` for iOS

**Files touched:**
- `public/manifest.json` (new file)
- `src/app/layout.tsx`

---

## TASK 6 — Streak tracking (Low effort, motivational hook)

**Problem:** No feedback on consistency. "You've logged X days in a row" is a proven retention feature.

**What to build:**
- Add `getStreak(userId: string): Promise<number>` to `src/server/services/dayService.ts`:
  - Query all `Day` rows for the user ordered by date desc
  - Walk backwards from today (or yesterday if today has no entry yet) counting consecutive days that have at least one meal logged (`meals.length > 0` or `totalCalories > 0`)
  - Return the count
- Add `streak` field to the `GET /api/days` response (all-days endpoint) in `src/app/api/days/route.ts`
- Update `ApiDay` context / `useNutritionData.ts` to expose `streak: number` from the all-days fetch
- Display a small pill in the main page header (e.g. "🔥 5-day streak") when streak ≥ 2; hide when 0 or 1
- Show it only on Today view, not History

**Files touched:**
- `src/server/services/dayService.ts`
- `src/app/api/days/route.ts`
- `src/app/hooks/useNutritionData.ts`
- `src/app/page.tsx`

---

## TASK 7 — Steps → calorie budget adjustment (Medium effort, meaningful UX)

**Problem:** Steps are tracked but never feed back into the calorie goal. 10 000 steps burn ~400 kcal, so ignoring them makes the calorie bar misleading.

**What to build:**
- Add a `stepCalorieAdjustment` boolean to `DailyGoals` (default `false`) in `src/app/types.ts`
- Add a toggle for it in `GoalsPanel` ("Adjust calorie target from steps")
- In `DayTotals`, when `goals.stepCalorieAdjustment === true` and `totals.steps > 0`:
  - Compute `earnedCalories = Math.round(totals.steps * 0.04)` (standard ~40 kcal per 1 000 steps)
  - Show effective calorie target as `goals.calories + earnedCalories`
  - Add a small footnote below the calorie bar: "+Xkcal from Y steps"
- No DB changes needed — the adjustment is computed at render time from existing data

**Files touched:**
- `src/app/types.ts`
- `src/app/components/GoalsPanel.tsx`
- `src/app/components/DayTotals.tsx`

---

## TASK 8 — Water intake tracking (Low effort, frequently expected)

**Problem:** Every mainstream nutrition app tracks water. It's a daily habit that pairs naturally with meal logging.

**What to build:**
- Add `totalWaterMl Int @default(0)` to the `Day` model in `prisma/schema.prisma`
- Create migration
- Add `updateDayWater(userId, date, waterMl)` to `src/server/services/dayService.ts` (same pattern as `updateDaySteps`)
- Extend `PATCH /api/days` to accept `{ date, waterMl }` in addition to the existing `{ date, steps }` (use a discriminated union or just check which field is present)
- Add `totalWaterMl` to `ApiDay` in `src/app/hooks/useNutritionData.ts`
- Add a `WaterTracker` component (new file `src/app/components/WaterTracker.tsx`):
  - Shows current intake as glasses (250 ml each) out of a configurable goal (default 8 glasses = 2 000 ml)
  - Row of glass icons (filled / outline) — click to add/remove a glass
  - Saves via the PATCH endpoint
- Render `WaterTracker` in `DayTotals.tsx` or directly in the Today view in `page.tsx` (above the macro rows)
- Add `waterGoal` (number, ml, default 2000) to `DailyGoals` and `GoalsPanel`

**Files touched:**
- `prisma/schema.prisma`
- `prisma/migrations/` (new migration)
- `src/server/services/dayService.ts`
- `src/app/api/days/route.ts`
- `src/app/hooks/useNutritionData.ts`
- `src/app/components/WaterTracker.tsx` (new file)
- `src/app/components/DayTotals.tsx` or `src/app/page.tsx`
- `src/app/types.ts`
- `src/app/components/GoalsPanel.tsx`

---

## TASK 9 — Data export as CSV (Low effort, user trust)

**Problem:** Users cannot get their data out. "Export my data" is a basic expectation and a trust signal.

**What to build:**
- Create `src/app/api/export/route.ts`:
  - `GET` — authenticated endpoint (real users only, not demo)
  - Fetches all `Meal` rows for the user via Prisma, ordered by `day.date` asc, then `createdAt` asc
  - Streams a CSV response with headers: `date,name,category,calories,protein,carbs,fat,satFat,fibre,addedSugar,naturalSugar,salt,alcohol,omega3`
  - Sets `Content-Disposition: attachment; filename="nutrition-export.csv"`
- Add an "Export CSV" button somewhere sensible in the UI — the goals panel footer or a small link in the history view header
- Demo users see the button disabled with a tooltip "Sign in to export"

**Files touched:**
- `src/app/api/export/route.ts` (new file)
- `src/app/page.tsx` or `src/app/components/GoalsPanel.tsx`

---

## TASK 10 — Google OAuth (Wider audience)

**Problem:** GitHub login is developer-facing. Google OAuth lets regular users sign in without needing a GitHub account.

**What to build:**
- Add `GoogleProvider` from `next-auth/providers/google` to `src/lib/auth.ts` alongside the existing `GitHubProvider`
- The `signIn` callback already gates by `ALLOWED_GITHUB_USERNAME` — add a parallel `ALLOWED_GOOGLE_EMAIL` env var check so only the owner's Google account can sign in (same allowlist pattern)
- Update `src/app/login/page.tsx` to show a "Sign in with Google" button alongside the GitHub one
- Document the two new env vars (`GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `ALLOWED_GOOGLE_EMAIL`) in README

**Files touched:**
- `src/lib/auth.ts`
- `src/app/login/page.tsx`
- `README.md` (env vars section only)

---

## TASK 11 — Body weight log (Medium effort, high context value)

**Problem:** Without weight data, calorie and protein goals have no personal baseline. Even a simple log adds meaningful context to trends.

**What to build:**
- Add `WeightEntry` model to `prisma/schema.prisma`:
  ```
  model WeightEntry {
    id        String   @id @default(cuid())
    userId    String
    date      String   // YYYY-MM-DD
    weightKg  Float
    createdAt DateTime @default(now())
    user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
    @@unique([userId, date])
    @@index([userId, date])
  }
  ```
- Create migration
- Create `src/app/api/weight/route.ts`:
  - `GET` — returns all entries for the user ordered by date desc (last 90 days)
  - `POST` — upsert a weight entry for the given date
  - `DELETE ?date=YYYY-MM-DD` — removes the entry for that date
- Create `src/app/hooks/useWeightLog.ts` — mirrors the pattern of `useStepSync`
- Create `src/app/components/WeightPanel.tsx`:
  - Small card shown in the Today view
  - Input: kg or lbs (toggle unit, convert internally to kg for storage)
  - Shows last 7 entries as a simple sparkline (can reuse Recharts)
  - Shows trend: "↑ +0.4 kg this week" / "↓ −0.6 kg this week"
- Render `WeightPanel` in the Today view in `page.tsx`

**Files touched:**
- `prisma/schema.prisma`
- `prisma/migrations/` (new migration)
- `src/app/api/weight/route.ts` (new file)
- `src/app/hooks/useWeightLog.ts` (new file)
- `src/app/components/WeightPanel.tsx` (new file)
- `src/app/page.tsx`

---

## TASK 12 — Add Zod validation to `PATCH /api/user/goals` (Bug)

**Problem:** The goals API route accepts arbitrary JSON with no schema validation. A malformed payload could corrupt the stored goals.

**What to build:**
- Add a `updateGoalsSchema` Zod schema to `src/server/contracts/` (or inline in the route) that mirrors `DailyGoals` — all numeric fields required
- Parse `body` through the schema in `PATCH /api/user/goals/route.ts` before writing to DB
- Return a 400 with validation details on failure (use the existing `handleApiError` + `ZodError` path)

**Files touched:**
- `src/app/api/user/goals/route.ts`
- `src/server/contracts/goals.ts` (new file)

---

## TASK 13 — Goals API route test coverage (Testing)

**Problem:** `src/app/api/user/goals/route.ts` (added in Task 1) has no tests. The service layer pattern used elsewhere has unit tests; this route has none.

**What to build:**
- Add `src/server/services/goalsService.test.ts` covering:
  - `GET` returns `DEFAULT_GOALS` merged with stored value
  - `GET` returns `DEFAULT_GOALS` when no goals stored yet
  - `PATCH` persists and round-trips correctly
  - `PATCH` with invalid body returns 400
  - Unauthenticated requests return 401

**Files touched:**
- `src/server/services/goalsService.test.ts` (new file)

---

## TASK 14 — Goals loading skeleton in GoalsPanel (UX)

**Problem:** On first load for a real user, `useGoals` shows `DEFAULT_GOALS` for ~200 ms while the server fetch is in flight. This causes a brief flash of default values before the real goals appear.

**What to build:**
- Pass `hydrated` from `useGoals` down to `GoalsPanel` (or read it at the consumer level)
- While `!hydrated`, render skeleton placeholder rows instead of real values
- Use Tailwind's `animate-pulse` — no new dependencies needed

**Files touched:**
- `src/app/components/GoalsPanel.tsx`
- `src/app/page.tsx` (pass `hydrated` through)

---

## TASK 15 — Prisma config file migration (Cleanup)

**Problem:** `package.json#prisma` is deprecated and will be removed in Prisma 7. A deprecation warning fires on every `prisma` CLI call.

**What to build:**
- Create `prisma.config.ts` at the project root with the equivalent configuration
- Remove the `prisma` key from `package.json`

**Files touched:**
- `prisma.config.ts` (new file)
- `package.json`

---

## TASK 16 — Redis-backed rate limiting for multi-instance deploys (Scalability)

**Problem:** Task 4's in-memory rate limiter resets per-process. If Railway scales to multiple instances, each instance has its own counter and the per-user limit is multiplied by the instance count.

**What to build:**
- Add an optional `REDIS_URL` env var
- When `REDIS_URL` is set, use `ioredis` to back the rate-limit store instead of the in-memory `Map`
- When absent, fall back to the existing in-memory implementation (no regression for single-instance)
- Document `REDIS_URL` in README

**Files touched:**
- `src/lib/rateLimit.ts`
- `README.md` (env vars section)
