import "server-only";
import { createSupabaseAdminClient } from "@/lib/supabase/server";
import { hashUserForAnalytics } from "@/lib/security/hash";

export type AnalyticsEvent =
  | "search_performed" | "vehicle_detail_viewed" | "vehicle_lookup_requested" | "vehicle_lookup_completed" | "valuation_requested"
  | "listing_started" | "listing_submitted" | "listing_approved" | "favorite_added" | "search_saved" | "contact_clicked"
  | "listing_marked_sold" | "report_submitted" | "otp_requested" | "otp_verified";

const FORBIDDEN_KEYS = ["plate", "plate_number", "phone", "phone_e164", "email", "token", "name", "display_name"];

/** Privacy-conscious analytics: no plates, phones, tokens or user identifiers; user id is hashed. */
export async function track(event: AnalyticsEvent, properties: Record<string, unknown> = {}, userId?: string | null): Promise<void> {
  try {
    const safe: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(properties)) {
      if (FORBIDDEN_KEYS.some((f) => k.toLowerCase().includes(f))) continue;
      if (typeof v === "string" && v.length > 120) continue;
      safe[k] = v;
    }
    const admin = createSupabaseAdminClient();
    if (!admin) {
      if (process.env.NODE_ENV !== "production") console.debug("[analytics]", event, safe);
      return;
    }
    await admin.from("analytics_events").insert({ event_name: event, user_hash: hashUserForAnalytics(userId), properties: safe as never });
  } catch (e) {
    console.error("[analytics] failed", e);
  }
}
