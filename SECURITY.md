# Security

## Reporting
Report vulnerabilities privately via the contact page (topic "legal") or the security contact configured for production. Do not open public issues for vulnerabilities.

## Model
| Layer | Controls |
|---|---|
| Edge (`src/proxy.ts`) | Session refresh, optimistic redirect for `/account` and `/admin`. **Not** an authorization boundary. |
| Server (pages, actions, route handlers) | `requireUser` / `requireRole` guards; Zod validation; ownership checks; rate limits; no trust in client-supplied ids or roles. |
| Database | RLS on every table; triggers enforce listing state machine, private-seller declaration, listing limits, column locks (moderation fields, plate hash, image hashes), immutable consent/moderation/contact/audit rows; SECURITY DEFINER functions with explicit grants. |
| Storage | Private bucket; uploads only by listing owner path; public listings served by signed URLs; pending images never public. |

## Key protections
- **Roles:** `user_roles` writes only by `super_admin` (never self-grant) or service role; first admin via `supabase/scripts/bootstrap_admin.sql`.
- **Sellers** cannot approve, change status arbitrarily, change seller id/moderation columns, or edit others' rows (tested).
- **Contact data:** phones live in `profiles` (owner/staff readable only) and are returned only by `reveal_seller_contact` (authenticated, opt-in channel, active listing, rate-limited, logged).
- **Plates:** full number only in `listing_private_data` (owner/moderator); public sees `plate_masked`; duplicate detection uses an HMAC computed **in the database** with a salt in a non-exposed `private` schema.
- **Images:** magic-byte sniffing (no SVG/HTML/executables), 12 MB cap, re-encode to WebP, EXIF/GPS stripped, SHA-256 + dHash; rows created server-side only.
- **Rate limits:** OTP send/verify, vehicle lookup (guest/user), contact reveal, uploads, reports, saved searches, valuation, contact form – Postgres-backed (`check_rate_limit`, service-role only).
- **Audit:** hash-chained `audit_logs` (append-only); `write_audit` only for staff/service.
- **Headers:** CSP, HSTS, X-Frame-Options DENY, nosniff, Referrer-Policy, Permissions-Policy; `poweredByHeader` off.
- **Secrets:** `SUPABASE_SECRET_KEY` only in server code (`server-only`); never `NEXT_PUBLIC_*`.
- **CSRF:** Server Actions are POST-only with Next.js origin checks; route handlers require the Supabase session cookie (`SameSite=Lax`) and mutate only with authenticated ownership checks; cron requires `Bearer CRON_SECRET`.
- **Logging:** no phones, plates or tokens in analytics; IPs only as salted hashes.

## Known gaps / follow-ups
- CSP uses `'unsafe-inline'` for scripts (Next.js inline runtime). Move to nonce-based CSP before launch.
- CAPTCHA for OTP is supported by Supabase but not configured.
- Push notifications need VAPID keys and subscription storage (architecture only).
- Penetration test and dependency audit (`npm audit`) must be run before launch.
