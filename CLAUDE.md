# CLAUDE.md – working agreement for AI agents

Read `AGENTS.md` (Next.js 16 notes: read `node_modules/next/dist/docs/` before using framework APIs) and `docs/IMPLEMENTATION_PLAN.md` first.

## Non-negotiables
- **Private sellers only.** Never add dealer/business accounts, dealer pages, inventory tools or an alternative commercial publishing route.
- Never display "בעלות מאומתת", "Verified owner" or "Verified private seller". Allowed: "טלפון מאומת", "המוכר הצהיר שהוא מוכר פרטי".
- Never fake an integration or a successful provider result. Unconfigured providers report `not_configured`.
- Never invent prices; internal valuation = "מחירי פרסום של מודעות דומות", only above the comparable threshold.
- Never expose full plates, phone numbers or the service key to the browser. Contact reveal goes only through `reveal_seller_contact`.

## Conventions
- Feature modules: `src/features/<feature>/{actions,queries,components,...}`; shared UI in `src/components/ui`.
- Server Components by default; `"use server"` actions validate with Zod and return `ActionResult`.
- Authorization: server guards in `src/lib/auth/guards.ts` **and** RLS/triggers in SQL. `proxy.ts` is only an optimistic redirect.
- DB changes = new numbered migration in `supabase/migrations` (never edit applied ones) + tests in `tests/integration` + `node scripts/gen-db-types.mjs`.
- Colors only from tokens in `src/app/globals.css`; Hebrew copy; numbers/plates wrapped in `.num` (LTR isolation) – inside table cells wrap in a span, not on the `<td>`.
- Before finishing: `npm run typecheck && npm run lint && npm test && npm run test:db && npm run build && npm run test:e2e`.
