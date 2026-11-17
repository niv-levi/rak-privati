# רק פרטי (Rak Privati)

> **רכב קונים מאנשים. לא מסוחרים.**
> An Israeli used-car marketplace for **private sellers only**. Hebrew-first, RTL, mobile-first, accessible.

No dealerships, traders, car lots, leasing companies or commercial accounts. The private-only rule is enforced in the product flow, in server code **and in the database** (triggers + RLS).

## Stack

Next.js 16 (App Router, React 19, TypeScript strict) · Tailwind CSS 4 · Radix UI (shadcn-style primitives in `src/components/ui`) · Supabase (Postgres, Auth phone OTP, Storage) · Zod · React Hook Form · Sharp · Vitest · Playwright + axe-core · Vercel.

## Quick start (local)

```bash
cp .env.example .env.local          # fill in Supabase values (see docs/DEPLOYMENT.md)
npm install
npm run dev                         # http://localhost:3000
```

Without Supabase variables the app runs in a clearly-labelled demo mode: public pages work, while login, publishing and saved data are disabled. No data is faked.

To see a populated vehicle report without government access, set `USE_DEV_FIXTURES=true` (development only, ignored in production) and check plates `1234567`, `7654321`, `8888888` or `9999999` (simulated outage).

## Scripts

| Command | What it does |
|---|---|
| `npm run dev` / `build` / `start` | Next.js |
| `npm run lint` / `typecheck` | ESLint 9 / `tsc --noEmit` |
| `npm test` | Unit tests (Vitest); DB tests auto-skip unless enabled |
| `npm run test:db` | SQL integration tests against `DATABASE_URL` (local Postgres) |
| `npm run test:e2e` | Playwright (desktop + mobile, axe) against a production build |
| `npm run db:reset:local` | Apply local shim + migrations + seed to a **local** DB |
| `node scripts/gen-db-types.mjs` | Regenerate `src/lib/database.types.ts` from the DB |

## Documentation

- `docs/IMPLEMENTATION_PLAN.md` – plan, status, what is done / remaining
- `docs/PRODUCT_SPECIFICATION.md`, `docs/ARCHITECTURE.md`, `docs/DATABASE.md`
- `docs/DATA_SOURCES.md` – providers, what is (not) connected, how to configure
- `docs/PRIVATE_SELLER_POLICY.md` – enforcement design
- `docs/ACCESSIBILITY.md`, `docs/PRIVACY.md`, `docs/LEGAL_REVIEW_CHECKLIST.md`
- `docs/DEPLOYMENT.md`, `docs/TESTING.md`, `docs/OPERATIONS.md`, `SECURITY.md`

## Status at a glance

Operational in code and tested: marketplace, search, listing detail, publishing wizard, images, moderation/admin, private-seller enforcement, favorites, saved searches, notifications, policies, PWA, SEO.

**Not operational until configured or contracted:** SMS provider (Supabase Phone Auth), data.gov.il resource IDs (never tested live from the build environment), commercial valuation and history providers, email provider. See `docs/DATA_SOURCES.md`.
