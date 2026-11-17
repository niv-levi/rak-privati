# Privacy engineering notes

| Data | Where | Who can read |
|---|---|---|
| Phone (E.164) | `auth.users`, `profiles.phone_e164` | owner, staff; buyers only via `reveal_seller_contact` (opt-in, logged, rate-limited) |
| Full plate | `listing_private_data`, `vehicle_lookup_results.plate_number` | owner, moderators |
| Plate hash | `listings.plate_hash` (DB HMAC), lookup tables (app HMAC) | not reversible without salts |
| IP / device | `account_signals`, `rate_limit_events`, `ip_hash` columns | salted hashes only; signals purged after 90 days |
| Analytics | `analytics_events` | anonymised user hash; forbidden keys filtered |
| Consents | `consent_records` (immutable, versioned) | owner, staff |

Separate consents: terms, privacy, private-seller declaration, contact sharing, marketing (never pre-checked).
Deletion: `/account/delete` → `request_account_deletion()` + auth user deletion with service key. Retention table in `/privacy`.
Image EXIF/GPS stripped server-side. Owner names from government data are never stored.

Before launch: register/assess database under the Privacy Protection Law (Amendment 13), DPA with Supabase/Vercel/SMS provider, cross-border transfer review, security procedures per the Data Security Regulations. See `docs/LEGAL_REVIEW_CHECKLIST.md`.
