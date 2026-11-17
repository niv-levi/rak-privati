# Product specification – רק פרטי

**Promise:** רכב קונים מאנשים. לא מסוחרים. A marketplace for privately owned passenger cars, sold by private individuals only.

## Users
| Persona | Can |
|---|---|
| Visitor | Browse active listings, search/filter, view details, vehicle check (rate-limited), valuation, compare (browser-only), read policies |
| Registered user (phone OTP) | Everything above + reveal seller contact (opt-in channels), favorites, saved searches + alerts, saved reports, notifications, report listings |
| Private seller (same account) | Publish up to 2 active/pending listings (configurable), drafts, edit, pause, mark sold, remove, appeal |
| Staff | Roles: super_admin, moderator, support, data_manager, analyst (see `docs/ARCHITECTURE.md`) |

## Routes
Public: `/`, `/cars`, `/cars/[id]`, `/vehicle-check`, `/valuation`, `/sell`, `/compare`, `/how-it-works`, `/about`, `/contact`, `/help`, `/faq`, `/accessibility`, `/terms`, `/privacy`, `/cookies`, `/private-seller-policy`, `/data-sources`, `/offline`.
Auth: `/login`, `/verify`.
Account: `/account`, `/account/{profile,listings,listings/new,listings/[id]/edit,favorites,searches,vehicle-checks,notifications,security,delete}`, `/vehicle-check/[id]` (saved report, owner only).
Admin: `/admin`, `/admin/{listings,listings/[id],users,users/[id],reports,vehicle-data,catalog,valuations,audit,settings}`.
API: `/api/listings/[id]/images` (POST/PATCH), `/api/listings/[id]/images/[imageId]` (DELETE), `/api/cron/expire`.

## Publishing flow (9 steps, autosaved per step)
1 plate → 2 confirm official data (or flag discrepancy) → 3 vehicle details → 4 price/location/condition → 5 photos (3–15, reorder, cover, rotate/crop, alt text) → 6 condition & description (no phones/links/dealer phrasing) → 7 contact preferences (phone/WhatsApp opt-in, separate consent) → 8 private-seller declaration (versioned, immutable) → 9 preview → submit for moderation.

## Data honesty rules
Official data, seller declarations, calculated values and unavailable info are shown separately and labelled. Every imported field carries source, dataset, retrieval date and status. Allowed trust badges: "טלפון מאומת", "המוכר הצהיר שהוא מוכר פרטי".

## Notifications
In-app for: approval, rejection, correction request, new inquiry (contact reveal), expiry, price drop on a favorite, saved-search match, account actions, appeal decisions. Email/SMS channels are adapters pending provider configuration. Marketing requires separate opt-in consent.

## Out of scope (MVP)
In-app chat (contact events table prepared), payments, motorcycles/trucks/fleets, any commercial seller feature (permanently).
