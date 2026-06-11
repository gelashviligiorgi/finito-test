# CLAUDE.md — Project Rules & Architecture

## Stack

- Next.js 16 (App Router), TypeScript, Tailwind CSS
- tRPC v11 + TanStack Query for all API calls
- Drizzle ORM + SQLite (better-sqlite3) for persistence
- Vitest for unit tests
- Playwright for e2e tests

## Architecture Rules

- All database access goes through tRPC routers only — never import db directly in components
- Server Components for all data fetching; Client Components only when interactivity is required (mark with "use client")
- All dates are YYYY-MM-DD strings — no Date objects crossing client/server boundaries
- Business logic lives in src/lib/ as pure functions — routers just call them
- tRPC routers are split by domain: src/server/trpc/routers/rates.ts, payslips.ts etc.
- Root router in src/server/trpc/router.ts composes domain routers

## Key Business Logic (src/lib/)

- src/lib/rates.ts — getApplicableRate(rates, date): finds the rate record with the largest effectiveFrom that is ≤ date, ignoring dismissed records
- src/lib/payslips.ts — computeTotal(lineItems, rates, date): computes payslip total using applicable rates
- src/lib/payslips.ts — isRetroactivelyChanged(payslip, currentTotal): compares snapshot total vs current total
- These must be pure functions with no DB or tRPC imports — makes them trivially testable

## Code Style

- Named exports everywhere — no default exports except Next.js page.tsx and layout.tsx
- Zod schemas for all tRPC input validation — colocate schema with router
- No `any` types — use `unknown` and narrow
- No raw SQL — Drizzle query builder only
- TailwindCSS only — no inline styles, no CSS modules
- kebab-case filenames, PascalCase component names

## Folder Structure

src/
app/ # Next.js pages and layouts
_components/ # Page-specific components (prefixed_ to avoid route conflicts)
components/ # Shared UI components
server/
db/
schema.ts # Barrel re-export (single entry point for drizzle config and imports)
schema/
employees.ts
payment-categories.ts
rates.ts
payslips.ts
relations.ts # Back-relations for employees and paymentCategories
index.ts # DB singleton
seed.ts # Seed script
trpc/
trpc.ts # initTRPC, middleware, base procedures
router.ts # Root router (composes domain routers)
routers/
rates.ts
payslips.ts
employees.ts
lib/
rates.ts # Pure rate resolution logic
payslips.ts # Pure payslip computation + retroactive detection
types/
index.ts # Shared TypeScript types inferred from Drizzle schema

## Testing Rules

### Unit Tests (Vitest)

- Test files sit next to source: src/lib/rates.test.ts, src/lib/payslips.test.ts
- Cover: getApplicableRate, computeTotal, isRetroactivelyChanged
- No mocking DB — these are pure functions, pass data directly
- Run with: npm run test

### E2E Tests (Playwright)

- Tests live in e2e/ folder at project root
- Use a separate test SQLite DB (set via TEST_DATABASE_URL env var)
- Reset and reseed DB before each test using a custom fixture
- Cover the critical flows as living documentation:
  1. Set effective date → view rates → edit a rate
  2. Create a payslip → verify total computed correctly
  3. Edit a rate retroactively → payslip highlights with old/new total
  4. Dismiss a retroactive change → payslip reverts to prior total
- Run with: npm run test:e2e

## Error Handling

- tRPC procedures throw TRPCError with appropriate codes (NOT_FOUND, BAD_REQUEST etc.)
- Client shows error messages inline — no silent failures

## Scripts (package.json)

- npm run dev — start dev server
- npm run build — production build
- npm run db:generate — drizzle-kit generate
- npm run db:migrate — drizzle-kit migrate
- npm run db:seed — tsx src/server/db/seed.ts
- npm run test — vitest
- npm run test:e2e — playwright test
- npm run typecheck — tsc --noEmit
