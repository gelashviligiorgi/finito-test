# Finito — Payroll Management

A payroll management app for managing employee rates, creating payslips, and detecting retroactive rate changes.

## Stack

- **Next.js 16** (App Router) — frontend and API layer
- **tRPC v11** — end-to-end type-safe API
- **TanStack Query** — client-side data fetching and cache management
- **Drizzle ORM + SQLite** (better-sqlite3) — database
- **Vitest** — unit and integration tests
- **Playwright** — end-to-end browser tests

---

## Getting Started

### 1. Install dependencies

```bash
npm install
```

### 2. Run database migrations

```bash
npm run db:migrate
```

This creates `sqlite.db` in the project root and applies all schema migrations from the `drizzle/` folder.

### 3. Seed the database

```bash
npm run db:seed
```

Inserts default employees (John Doe, Jane Smith, Bob Johnson) and payment categories (Hourly Rate, Overtime Hourly, Commission, Global Pay).

### 4. Install Playwright browsers

```bash
npx playwright install
```

Downloads the browser binaries required for e2e tests (Chromium, Firefox, WebKit). This is a one-time step — no global installation needed, `npx` uses the locally installed package.

### 5. Start the dev server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## Environment Variables

| Variable            | Default       | Description                                   |
| ------------------- | ------------- | --------------------------------------------- |
| `DATABASE_URL`      | `./sqlite.db` | Path to the SQLite database file              |
| `TEST_DATABASE_URL` | `./test.db`   | Path to the SQLite database used by e2e tests |

No `.env` file is required for local development — defaults are used automatically.

---

## Inspecting the Database

```bash
npx drizzle-kit studio
```

Opens a browser-based UI at `https://local.drizzle.studio` where you can browse all tables and run queries against `sqlite.db`. No global installation needed — `npx` uses the locally installed `drizzle-kit` from devDependencies.

---

## Running Tests

### Unit & Integration Tests (Vitest)

```bash
npm run test          # run once
npm run test:watch    # watch mode
```

Tests are colocated next to the source files they cover:

| File                                       | What it tests                                                           |
| ------------------------------------------ | ----------------------------------------------------------------------- |
| `src/lib/rates.test.ts`                    | Pure rate-resolution functions (`getApplicableRate`, `getAllRatesAsOf`) |
| `src/lib/payslips.test.ts`                 | Pure payslip computation (`computeTotal`, `isRetroactivelyChanged`)     |
| `src/server/trpc/routers/payslips.test.ts` | tRPC payslips router against an in-memory SQLite database               |

The router integration tests replace the real DB singleton with an in-memory SQLite instance (schema migrated on startup) so procedures run against real SQL without a running server or database on disk.

### End-to-End Tests (Playwright)

```bash
npm run test:e2e
```

Playwright starts a dev server on port 3001 pointing at `test.db` (separate from the dev database). The global setup migrates `test.db` on first run. Each test resets and reseeds all tables before running.

A real Chromium window opens while tests run (`headless: false` in `playwright.config.ts`). This is intentional for local development so you can watch the tests execute. In CI, `headless` defaults to `true` — no browser window opens.

E2E test files live in `e2e/`:

| File                       | What it covers                                          |
| -------------------------- | ------------------------------------------------------- |
| `e2e/landing.spec.ts`      | Landing page navigation                                 |
| `e2e/rates.spec.ts`        | Setting and editing rates                               |
| `e2e/payslips.spec.ts`     | Creating payslips, retroactive changes, dismissal flows |
| `e2e/payslip-form.spec.ts` | Create payslip dialog form validation and UX            |

---

## Frontend Architecture

All pages live in `src/app/` and are thin Server Components that render a view component:

```text
src/app/
  page.tsx                  → landing page
  payslips/page.tsx         → renders <PayslipsView />
  rates/page.tsx            → renders <RatesView />
  api/trpc/[trpc]/route.ts  → tRPC HTTP handler (all API calls go here)
```

View components live in `src/views/` and are Client Components (`"use client"`). They own state and data fetching via tRPC hooks:

```text
src/views/
  payslips/
    index.tsx               → PayslipsView — queries, mutation handlers
    payslip-table.tsx       → table rendering
    create-payslip-dialog.tsx
    create-form.tsx         → form state and submission
    line-items-editor.tsx   → extracted line items UI
  rates/
    index.tsx               → RatesView
    rate-table.tsx
```

Shared UI components live in `src/components/`. These have no business logic — layout, inputs, buttons only.

**Data flow:**

```text
Server Component (page.tsx)
  └─ renders Client Component (view)
       └─ trpc.someRouter.someQuery.useQuery()
            └─ HTTP POST to /api/trpc
                 └─ tRPC Route Handler
                      └─ calls router procedure (server)
                           └─ Drizzle query → SQLite
```

Mutations follow the same path. On success, `utils.someRouter.someQuery.invalidate()` triggers a background refetch — no full page reload.

---

## Backend Architecture

### tRPC setup

```text
src/server/trpc/
  trpc.ts       → initTRPC: creates publicProcedure, protectedProcedure, router
  router.ts     → root AppRouter — composes all domain routers
  routers/
    employees.ts
    payment-categories.ts
    rates.ts
    payslips.ts
```

`AppRouter` is exported as a type and imported by the tRPC client in `src/contexts/trpc-provider.tsx` — this is what gives full end-to-end type safety with no code generation.

### Database

```text
src/server/db/
  index.ts          → DB singleton (better-sqlite3 + Drizzle)
  schema.ts         → barrel re-export (single entry point)
  schema/
    employees.ts
    payment-categories.ts
    rates.ts          → includes the dismissed flag and append-only design
    payslips.ts       → payslips, line items, snapshots + their relations
    relations.ts      → back-relations for employees and paymentCategories
                        (kept separate to avoid circular imports)
  seed.ts
```

### Business logic

Pure functions with no DB or tRPC imports live in `src/lib/`. Routers call them; tests pass data directly without any mocking.

| Function                                    | Description                                                              |
| ------------------------------------------- | ------------------------------------------------------------------------ |
| `getApplicableRate(rates, date)`            | Returns the single active rate for a category as of a date               |
| `getAllRatesAsOf(rates, date)`              | Returns a `Map<categoryId, Rate>` — one winner per category as of a date |
| `computeTotal(lineItems, rateMap)`          | Multiplies units × rate for each line item and sums                      |
| `isRetroactivelyChanged(original, current)` | Returns true if totals differ beyond floating-point noise                |

---

## Temporal Data Model

Rates are **never updated or deleted**. To change a rate, a new record is inserted with a newer `effectiveFrom` date. `getAllRatesAsOf` picks the winner: most recent `effectiveFrom` ≤ requested date, with `id` as a tiebreaker for same-date edits.

The `dismissed` flag marks a rate as superseded without erasing history. This is the only field that gets mutated on an existing rate record.

**Consequences of this design:**

- Historical payslip totals are always recomputable from the original rate records
- A `payslip_snapshots` table captures `originalTotal` at creation time for comparison
- When a rate is retroactively changed, `isRetroactivelyChanged` detects the drift and the UI surfaces a dismiss button
- Dismissing a rate affects all payslips that used it — the rate is either correct or it isn't
- Multiple edits on the same `effectiveFrom` date form an implicit undo stack — each dismiss steps back one version

---

## Scripts

| Command               | Description                                          |
| --------------------- | ---------------------------------------------------- |
| `npm run dev`         | Start dev server on port 3000                        |
| `npm run build`       | Production build                                     |
| `npm run db:generate` | Generate Drizzle migration files from schema changes |
| `npm run db:migrate`  | Apply pending migrations                             |
| `npm run db:seed`     | Insert default employees and categories              |
| `npm run test`        | Run Vitest unit and integration tests                |
| `npm run test:watch`  | Run Vitest in watch mode                             |
| `npm run test:e2e`    | Build and run Playwright e2e tests                   |
| `npm run lint`        | Run ESLint                                           |
| `npm run format`      | Format all files with Prettier                       |
