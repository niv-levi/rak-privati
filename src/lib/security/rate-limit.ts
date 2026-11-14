import "server-only";
import { createSupabaseAdminClient } from "@/lib/supabase/server";

type Bucket = "otp_send" | "otp_verify" | "lookup_guest" | "lookup_user" | "upload" | "report" | "valuation" | "contact_form" | "saved_search";

const memory = new Map<string, number[]>();

/**
 * Rate limit backed by Postgres (shared across instances). Falls back to an
 * in-memory window when Supabase is not configured (local dev only).
 */
export async function rateLimit(bucket: Bucket, key: string, limit: number, windowSeconds: number): Promise<boolean> {
  const admin = createSupabaseAdminClient();
  if (admin) {
    const { data, error } = await admin.rpc("check_rate_limit", { p_bucket: bucket, p_key: key, p_limit: limit, p_window_seconds: windowSeconds });
    if (error) {
      console.error("[rate-limit] rpc failed; failing closed", error.message);
      return false;
    }
    return data === true;
  }
  const now = Date.now();
  const k = `${bucket}:${key}`;
  const hits = (memory.get(k) ?? []).filter((t) => now - t < windowSeconds * 1000);
  if (hits.length >= limit) return false;
  hits.push(now);
  memory.set(k, hits);
  return true;
}
