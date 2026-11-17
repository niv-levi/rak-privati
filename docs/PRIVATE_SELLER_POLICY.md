# Private-seller enforcement design

Public policy text: `/private-seller-policy`. This document describes enforcement.

1. **Identity friction:** Israeli mobile OTP, one account per number (Supabase), declaration per listing (versioned consent + `seller_declarations`).
2. **Hard limits (DB):** default 2 active/pending listings (`application_settings.max_active_listings`, per-user override by staff). Enforced in the submission trigger, not only in UI.
3. **Content rules:** wizard rejects phone numbers, links and dealer phrasing (`מגרש`, `סוחר`, `מלאי`, `מימון`, `טרייד-אין`, `אחריות לשנה`, …) in descriptions.
4. **Automatic flags (never automatic verdicts):** duplicate plate across accounts (DB-computed HMAC, sellers cannot spoof), duplicate/near-duplicate images (server-computed hashes, sellers cannot insert image rows), similar descriptions, frequency, distinct vehicles over time, related accounts (hashed IP/device), non-private ownership, user reports ("suspected dealer" = severity 3), strict-review accounts.
5. **Human moderation:** every listing reviewed before publication; flags shown on the moderation page with duplicate lookup and seller history.
6. **Account controls:** warn, suspend, block, strict review, listing-limit override; suspension/blocking pauses listings automatically.
7. **Appeals:** user-filed, staff-decided with reason; immutable moderation history.
8. **No commercial route:** no business accounts, dealer pages or inventory tools exist in code or schema.

Known residual risks: a determined dealer using multiple real SIM cards and devices, or rotating images; mitigated by plate duplicate detection across accounts and reports. Document-based ownership verification is a possible future step (would require a privacy review).
