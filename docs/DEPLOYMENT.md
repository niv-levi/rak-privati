# Deployment (Supabase + Vercel)

Nothing in this repository has been deployed. Steps for the operator:

## 1. Supabase
1. Create a project (region close to Israel, e.g. eu-central-1).
2. Apply migrations in order (`supabase db push` with the CLI, or paste each file in the SQL editor). **Do not** apply `supabase/tests/00_local_shim.sql`.
3. Run `supabase/seed.sql`.
4. Auth → Providers → Phone: enable, choose SMS provider (Twilio / MessageBird / Vonage / Textlocal), enter credentials. Set OTP expiry ≤ 10 min, rate limits, optional CAPTCHA (Turnstile/hCaptcha). For development add Test OTPs (phone → code).
5. Auth → URL configuration: site URL = production URL.
6. Storage: bucket `listing-images` is created by migration 0009 (private).
7. First admin: sign in once with your phone, then run `supabase/scripts/bootstrap_admin.sql` (edit the phone first).
8. Backups: enable PITR (Pro plan) – see `docs/OPERATIONS.md`.

## 2. Environment variables (Vercel → Settings → Environment Variables)
See `.env.example`. Required: `NEXT_PUBLIC_APP_URL`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SECRET_KEY`, `HASH_SALT`, `CRON_SECRET`. Set `AUTH_SMS_CONFIGURED=true` after SMS works. Data providers per `docs/DATA_SOURCES.md`. Never set `USE_DEV_FIXTURES` in production (ignored anyway).

## 3. Vercel
Import the GitHub repo, framework Next.js, Node 22. `vercel.json` registers the daily cron (`/api/cron/expire`). Add the production domain and update `NEXT_PUBLIC_APP_URL`.

## 4. Post-deploy smoke test
Login with OTP → publish a draft through all steps → approve as moderator → see it on `/cars` → reveal contact as another user → mark sold. Check `/admin/vehicle-data` provider status and `/sitemap.xml`.
