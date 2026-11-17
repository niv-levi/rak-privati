# Operations

## Daily
- Moderation queue `/admin/listings` (pending sorted oldest first) and open flags; reports and appeals `/admin/reports`.
- Provider health `/admin/vehicle-data`.

## Scheduled
- `/api/cron/expire` daily 03:17 UTC: expire listings + retention (signals 90 d, analytics 13 months).
- Recommended additional jobs: purge `rate_limit_events` older than 7 days; anonymise removed listings after 12 months; delete auth users whose profile is `deleted` (if service key was unavailable at deletion time).

## Monitoring
Vercel logs (structured `[module]` prefixes), Supabase logs, provider `last_error` columns, audit log chain status on `/admin/audit`.

## Backup & restore
Supabase PITR (7+ days) plus a weekly logical dump (`pg_dump --schema=public --schema=private`) to separate storage. Storage bucket: periodic copy via Supabase Storage API. Quarterly restore drill into a staging project; verify `audit_logs` chain after restore.

## Incidents
Revoke `SUPABASE_SECRET_KEY` and rotate on suspected leak; rotating `HASH_SALT` invalidates lookup caches only. The plate salt lives in `private.secrets` – rotating it requires recomputing `listings.plate_hash` (`update listing_private_data set plate_number = plate_number`).

## Settings
`/admin/settings` (super_admin): listing limit, expiry days, rate limits, flag thresholds, valuation thresholds, accessibility contact.
