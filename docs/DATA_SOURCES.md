# Data sources and providers

| Provider | Kind | Status in repository | Needed to operate |
|---|---|---|---|
| gov_il_vehicles | Ministry of Transport registry via data.gov.il CKAN `datastore_search` | Adapter implemented & unit-tested with fixtures. **Never called live** (data.gov.il was unreachable from the build environment). | `GOV_VEHICLE_RESOURCE_ID` (verify on data.gov.il), verify field names (override with `GOV_VEHICLE_FIELD_MAP`), confirm license terms for commercial use |
| gov_il_vehicle_history | Test mileage + ownership-type history | Same as above | `GOV_VEHICLE_HISTORY_RESOURCE_ID`, `GOV_VEHICLE_HISTORY_FIELD_MAP` |
| gov_il_recalls | Recall notices | Same as above | `GOV_VEHICLE_RECALLS_RESOURCE_ID`, `GOV_VEHICLE_RECALLS_FIELD_MAP` |
| commercial_valuation | Commercial price provider | Interface + honest `not_configured` | Commercial agreement + API docs + key |
| commercial_history | Accident/insurance history | Interface + honest `not_configured` | Commercial agreement + API docs + key |
| supabase_phone_auth | SMS OTP | Integration code complete | SMS provider configured in Supabase dashboard; set `AUTH_SMS_CONFIGURED=true` |
| email_provider | Transactional email | Preference UI only | Provider + `EMAIL_*` vars |
| analytics | Internal `analytics_events` | Operational (no PII) | – |
| internal_listings (valuation) | Asking prices of similar listings | Operational; produces a range only with ≥5 comparables | Enough listings |

## Configuring data.gov.il
1. Open the dataset pages on data.gov.il for private vehicles, test history and recalls; copy each resource id.
2. Verify column names against the dataset dictionary; if different from the defaults in `src/lib/providers/gov-il/*.ts`, set the `*_FIELD_MAP` JSON env vars.
3. Confirm the licence permits commercial display and record attribution on `/data-sources`.
4. Use `/admin/vehicle-data` → "בדיקת חיבור" with a known plate; check the run log.

## Limitations shown to users
No record ≠ no problem; ownership-type rows ≠ number of owners; last test mileage ≠ current mileage; no recall ≠ accident-free; datasets lag. Owner names are never stored or shown. Plates are masked publicly and hashed in analytics.

No scraping, no undocumented endpoints, no bypassing access controls.
