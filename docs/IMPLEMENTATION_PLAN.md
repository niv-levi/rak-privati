# רק פרטי (Rak Privati) — Implementation Plan

> Status: living document. Written at project start (Phase 2) and updated at the end of the build.
> Product promise: **"רכב קונים מאנשים. לא מסוחרים."** — a private-seller-only passenger-car marketplace for Israel.

## 1. Repository inspection (Phase 1)

- The repository `niv-levi/rak-privati` was empty (no commits, no files) on branch `claude/rak-privati-marketplace-quhswl`.
- Scaffolded with `create-next-app@latest` (Next.js 16.4, React 19.3, TypeScript, Tailwind CSS 4, ESLint 9 flat config, `src/` directory, `@/*` alias).
- Decision: **`cacheComponents` disabled.** The default scaffold enables Cache Components (PPR). This product is authentication-heavy and database-driven on almost every route; the classic dynamic-rendering model is simpler, well-understood and lower-risk for an MVP. It can be enabled later route-by-route.
- Decision: `shadcn/ui`-style primitives are authored in-repo (`src/components/ui`) on top of the `radix-ui` package, using the same API conventions (cva + tailwind-merge). The shadcn registry was not reachable from the build environment; `components.json` is present so `npx shadcn add` works later.
- Decision: Heebo is **self-hosted** (`public/fonts`, `next/font/local`) — no runtime requests to Google Fonts (privacy, performance, offline PWA).

## 2. Assumptions

| # | Assumption | Impact |
|---|-----------|--------|
| A1 | Supabase project (Postgres + Auth + Storage) will be provisioned by the owner. | All DB code targets Supabase; migrations are plain SQL under `supabase/migrations`. |
| A2 | SMS OTP provider (Twilio/MessageBird/Vonage via Supabase Phone Auth) is **not configured** yet. | UI + integration complete; a clear "not configured" status is shown; dev-only test phone numbers documented. |
| A3 | Government open data (data.gov.il CKAN datastore) is the first vehicle-data source. Resource IDs are **environment-configurable** and must be verified by the operator; the build environment could not reach data.gov.il. | Adapter is real (documented public CKAN API), fixtures isolated to dev/test, status "not configured" until `GOV_VEHICLE_RESOURCE_ID` etc. are set and verified. |
| A4 | No commercial valuation provider agreement exists. | Valuation engine is modular; only the internal "asking prices of similar listings" source is active and clearly labeled. |
| A5 | No email provider configured. | Email channel adapter exists; in-app notifications are primary. |
| A6 | Legal pages are drafts requiring review by Israeli counsel. | Marked in pages and `docs/LEGAL_REVIEW_CHECKLIST.md`. |
| A7 | Admin bootstrap via a server-side SQL/CLI step, never through user-controlled fields. | `supabase/scripts/bootstrap_admin.sql` + documented procedure. |

## 3. Missing external credentials / permissions

- `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (anon), `SUPABASE_SECRET_KEY` (service role; server only).
- Supabase Phone Auth SMS provider credentials (configured in Supabase dashboard, not in this repo).
- data.gov.il: verification of resource IDs and license terms for commercial use (open government license — attribution required).
- Commercial valuation provider: requires a commercial agreement (not available).
- Expanded vehicle-history provider: requires a commercial agreement (not available).
- Email provider (Resend/Postmark/SES): optional.
- CAPTCHA (Turnstile/hCaptcha) for OTP: optional, supported via Supabase Auth settings.

## 4. Architecture summary

- **Frontend/Backend:** Next.js App Router (RSC by default, Client Components for interactivity), Route Handlers + Server Actions for mutations, `proxy.ts` for session refresh and optimistic auth redirects; real authorization is enforced inside each server page/action.
- **Data:** Supabase Postgres with RLS on every table; service-role client only on the server (`server-only`).
- **Feature modules:** `src/features/<feature>/{components,actions,queries,schemas}`.
- **Providers:** `src/lib/providers` registry with adapters: gov vehicle info, mileage/ownership history, recalls, valuation, extended history, SMS (via Supabase), email, analytics.
- **Security:** rate limiting (DB-backed, `rate_limit_events` table), security headers, Zod validation on server, masked registration numbers, contact reveal through server action with audit.
- **Accessibility:** semantic HTML, RTL, focus-visible, skip link, reduced motion, labeled forms, axe tests in Playwright.

## 5. Route plan

See `docs/PRODUCT_SPECIFICATION.md` §Routes. All routes in the master prompt are implemented as App Router segments under `src/app`.

## 6. Database plan

See `docs/DATABASE.md`. Migrations:

1. `0001_extensions_and_types.sql` — extensions, enums.
2. `0002_core_identity.sql` — profiles, user_roles, policy_versions, consent_records, seller_declarations.
3. `0003_catalog_and_geo.sql` — vehicle makes/models/trims/aliases, geo districts/regions/cities.
4. `0004_listings.sql` — listings, listing_images, price history, favorites, saved_searches, recently_viewed, contact_events, listing_reports.
5. `0005_vehicle_data.sql` — data sources, sync runs, lookup requests/results, history records, recalls, valuations.
6. `0006_moderation_and_admin.sql` — moderation_actions/flags, appeals, notifications, audit_logs, application_settings, rate limits, analytics events.
7. `0007_functions_and_triggers.sql` — helper functions (`is_admin`, `has_role`), updated_at triggers, listing limits, duplicate detection triggers, audit triggers.
8. `0008_rls.sql` — all RLS policies.
9. `0009_storage.sql` — storage buckets and policies.
10. `seed.sql` — settings, policy versions, catalog, cities (dev/prod-safe reference data).

## 7. Phases and execution order

1. Foundation config (this doc, env example, scripts, test config).
2. Brand + design system + layout.
3. Database + RLS + SQL tests (run against local Postgres with an `auth` shim).
4. Core product: auth, marketplace, detail, publishing wizard, account.
5. Vehicle data: providers, lookup, report, valuation.
6. Admin.
7. Legal, SEO, PWA, analytics, docs.
8. Tests, build, visual QA, audit, fixes, delivery report.

## 8. Out of scope for MVP (explicitly)

- In-app chat (architecture prepared via `contact_events` + `conversation` placeholder design, no fake chat).
- Payments / promoted listings.
- Motorcycles, trucks, fleets, dealers (never).
