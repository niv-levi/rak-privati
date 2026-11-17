# Database

Postgres (Supabase). Apply migrations in order; never edit an applied migration.

| Migration | Content |
|---|---|
| 0001 | extensions (pgcrypto, pg_trgm), enums |
| 0002 | profiles, user_roles, policy_versions, consent_records, seller_declarations |
| 0003 | vehicle catalog (makes, models, trims, aliases, import runs, `vehicle_catalog` view), geography (districts, regions, cities), `distance_km` |
| 0004 | listings, listing_private_data, listing_images, price history, favorites, saved_searches, recently_viewed, contact_events, listing_reports |
| 0005 | data sources, sync runs, lookup requests/results, saved reports, history records, recalls, valuation sources, valuations |
| 0006 | moderation actions/flags, appeals, notifications, audit_logs, settings, rate limits, account signals, analytics |
| 0007 | helper/role functions, triggers (state machine, limits, abuse detection, notifications, expiry, contact reveal, search RPC, comparables, account deletion) |
| 0008 | RLS policies, `public_listings` view, grants |
| 0009 | storage bucket `listing-images` (private) + policies |
| 0010 | contact_messages |
| 0011 | hardening: function grants, `write_audit` staff-only, `is_privileged_session` |
| 0012 | DB-computed plate HMAC (`private.secrets`), seller plate/hash locks, server-only image inserts, image cap for all roles, non-private ownership flag |

## Listing state machine (enforced in `guard_listing_changes`)
`draft → pending_review → active | rejected | needs_correction`; `needs_correction → pending_review`; `active ⇄ paused` (seller cannot reactivate a moderator pause); `active|paused → sold`; any → `removed`; `active → expired` by job. Sellers can delete drafts only. Submission requires a valid non-revoked declaration, required fields, ≥3 ready images and the per-account limit.

## Private-seller enforcement (triggers)
Duplicate plate across accounts, duplicate/near-duplicate images, similar descriptions (pg_trgm ≥0.75), listing frequency, distinct vehicles in 180 days, related accounts via hashed IP/device signals, user reports, strict-review accounts, non-private ownership → `moderation_flags`. Flags never change account status automatically.

## Immutability
`consent_records`, `moderation_actions`, `contact_events`, `audit_logs` (hash chain) reject UPDATE/DELETE; `seller_declarations` only allow revocation fields.

## Local testing
`tests/integration/*.test.ts` run against local Postgres 16 with `supabase/tests/00_local_shim.sql` (auth schema, `auth.uid()`, API roles, storage) – never apply the shim to Supabase.
