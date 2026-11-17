# Testing

| Suite | Command | Needs | Covers |
|---|---|---|---|
| Unit | `npm test` | – | phone/plate parsing, search params, wizard schemas (dealer/contact text rules), vehicle report builder (partial/conflicting/timeout/not configured), image sniffing/EXIF strip/rotate/crop/dHash, valuation engine, OTP flow + rate limiting (mocked Supabase), error translation |
| DB integration | `npm run test:db` | local Postgres (`DATABASE_URL`), `npm run db:reset:local` first | RLS, roles, state machine, limits, declaration, abuse flags, appeals, contact reveal + rate limit, immutability, storage policies, deletion, search RPC (filters/sort/pagination/radius), comparables, saved-search alerts, price-drop alerts, expiry, function grants, plate-hash anti-spoofing, server-only images |
| E2E | `npm run build && npm run test:e2e` | Chromium (preinstalled) | public pages, RTL, honest empty/not-configured states, guards, API auth, cron auth, headers, robots/sitemap/manifest, axe WCAG 2.2 AA on 17 routes (desktop+mobile), keyboard, mobile menu, reflow, zoom, reduced motion, search URL state |

## Not covered automatically (and why)
Authenticated browser flows (wizard, account, admin, contact reveal UI) need a running Supabase stack. Container registries were unavailable in the build environment, so a local Supabase could not be started. Their business rules are covered at the SQL layer and the UI compiles/type-checks. Run these manually after configuring Supabase (see the smoke test in `docs/DEPLOYMENT.md`), and consider adding Playwright specs with `supabase start` in CI.
