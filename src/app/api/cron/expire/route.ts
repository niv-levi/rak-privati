import { NextResponse, type NextRequest } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

/** Scheduled job (Vercel Cron): expire listings past expires_at. Protected by CRON_SECRET. */
export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  const auth = req.headers.get("authorization");
  if (!secret || auth !== `Bearer ${secret}`) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const admin = createSupabaseAdminClient();
  if (!admin) return NextResponse.json({ error: "not configured" }, { status: 503 });
  const { data, error } = await admin.rpc("expire_listings");
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  // Retention: drop old rate-limit rows, analytics older than 13 months, account signals older than 90 days
  await admin.from("account_signals").delete().lt("last_seen_at", new Date(Date.now() - 90 * 86400000).toISOString());
  await admin.from("analytics_events").delete().lt("created_at", new Date(Date.now() - 395 * 86400000).toISOString());
  return NextResponse.json({ expired: data ?? 0 });
}
