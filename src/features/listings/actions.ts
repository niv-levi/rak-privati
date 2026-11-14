"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createSupabaseServerClient, getCurrentUser } from "@/lib/supabase/server";
import { fail, succeed, translateDbError, type ActionResult } from "@/lib/actions/result";
import { rateLimit } from "@/lib/security/rate-limit";
import { getClientIp } from "@/lib/security/request";
import { hashIp } from "@/lib/security/hash";
import { track } from "@/lib/analytics/track";
import type { Enums } from "@/lib/database.types";

export type RevealedContact = { phone_e164: string; display_name: string | null; contact_hours: string | null };

/** Protected contact reveal — the only path that returns a seller's phone number. */
export async function revealContactAction(listingId: string, channel: Enums<"contact_channel">): Promise<ActionResult<RevealedContact>> {
  const [user, supabase] = await Promise.all([getCurrentUser(), createSupabaseServerClient()]);
  if (!user || !supabase) return fail("יש להתחבר כדי לראות את פרטי הקשר של המוכר.", { code: "auth" });
  if (!z.string().uuid().safeParse(listingId).success) return fail("מזהה לא תקין");
  const { data, error } = await supabase.rpc("reveal_seller_contact", { p_listing: listingId, p_channel: channel });
  if (error) return fail(translateDbError(error.message), { code: error.message.includes("RATE_LIMITED") ? "rate_limited" : undefined });
  const row = data?.[0];
  if (!row) return fail("פרטי הקשר אינם זמינים.");
  await track("contact_clicked", { listing_id: listingId, channel }, user.id);
  return succeed({ phone_e164: row.phone_e164, display_name: row.display_name, contact_hours: row.contact_hours });
}

const reportSchema = z.object({
  listingId: z.string().uuid(),
  reason: z.enum(["suspected_dealer", "wrong_info", "sold_already", "scam", "offensive", "duplicate", "other"]),
  details: z.string().trim().max(2000).optional(),
});

export async function reportListingAction(input: z.infer<typeof reportSchema>): Promise<ActionResult> {
  const parsed = reportSchema.safeParse(input);
  if (!parsed.success) return fail("פרטי הדיווח אינם תקינים");
  const [user, supabase] = await Promise.all([getCurrentUser(), createSupabaseServerClient()]);
  if (!supabase) return fail("השירות אינו זמין כרגע.");
  const ip = await getClientIp();
  const key = user?.id ?? ip ?? "anon";
  if (!(await rateLimit("report", key, 5, 3600))) return fail("נשלחו יותר מדי דיווחים. נסו שוב מאוחר יותר.");
  if (parsed.data.reason === "other" && !parsed.data.details) return fail("יש לפרט את סיבת הדיווח", { fieldErrors: { details: "יש לפרט" } });
  const { createSupabaseAdminClient } = await import("@/lib/supabase/server");
  const client = user ? supabase : createSupabaseAdminClient();
  if (!client) return fail("השירות אינו זמין כרגע.");
  const { error } = await client.from("listing_reports").insert({ listing_id: parsed.data.listingId, reporter_id: user?.id ?? null, reason: parsed.data.reason, details: parsed.data.details ?? null, ip_hash: hashIp(ip) });
  if (error) return fail(translateDbError(error.message));
  await track("report_submitted", { reason: parsed.data.reason }, user?.id);
  return succeed(undefined, "תודה, הדיווח התקבל ויטופל על ידי צוות הבקרה.");
}

/** Called from the client after a detail page renders: view counter + recently viewed (logged-in). */
export async function registerListingViewAction(listingId: string): Promise<void> {
  if (!z.string().uuid().safeParse(listingId).success) return;
  const [user, supabase] = await Promise.all([getCurrentUser(), createSupabaseServerClient()]);
  if (!supabase) return;
  await supabase.rpc("increment_listing_views", { p_listing: listingId });
  if (user) {
    await supabase.from("recently_viewed").upsert({ user_id: user.id, listing_id: listingId, viewed_at: new Date().toISOString() });
  }
  await track("vehicle_detail_viewed", { listing_id: listingId }, user?.id);
}

export async function markSoldAction(listingId: string): Promise<ActionResult> {
  const [user, supabase] = await Promise.all([getCurrentUser(), createSupabaseServerClient()]);
  if (!user || !supabase) return fail("יש להתחבר.");
  const { error } = await supabase.from("listings").update({ status: "sold" }).eq("id", listingId).eq("seller_id", user.id);
  if (error) return fail(translateDbError(error.message));
  await track("listing_marked_sold", { listing_id: listingId }, user.id);
  revalidatePath("/account/listings");
  return succeed(undefined, "המודעה סומנה כנמכרה. בהצלחה!");
}

export async function setListingStatusAction(listingId: string, status: "paused" | "active" | "removed"): Promise<ActionResult> {
  const [user, supabase] = await Promise.all([getCurrentUser(), createSupabaseServerClient()]);
  if (!user || !supabase) return fail("יש להתחבר.");
  const { error } = await supabase.from("listings").update({ status }).eq("id", listingId).eq("seller_id", user.id);
  if (error) return fail(translateDbError(error.message));
  revalidatePath("/account/listings");
  revalidatePath(`/cars/${listingId}`);
  return succeed(undefined, status === "paused" ? "המודעה הושהתה" : status === "active" ? "המודעה הופעלה מחדש" : "המודעה הוסרה");
}

export async function deleteDraftAction(listingId: string): Promise<ActionResult> {
  const [user, supabase] = await Promise.all([getCurrentUser(), createSupabaseServerClient()]);
  if (!user || !supabase) return fail("יש להתחבר.");
  const { error } = await supabase.from("listings").delete().eq("id", listingId).eq("seller_id", user.id).eq("status", "draft");
  if (error) return fail(translateDbError(error.message));
  revalidatePath("/account/listings");
  return succeed(undefined, "הטיוטה נמחקה");
}

export async function submitAppealAction(input: { listingId?: string; message: string }): Promise<ActionResult> {
  const [user, supabase] = await Promise.all([getCurrentUser(), createSupabaseServerClient()]);
  if (!user || !supabase) return fail("יש להתחבר.");
  const msg = input.message.trim();
  if (msg.length < 10 || msg.length > 2000) return fail("הודעת הערעור צריכה להכיל בין 10 ל-2000 תווים");
  const { data: action } = input.listingId
    ? await supabase.from("moderation_actions").select("id").eq("listing_id", input.listingId).in("action", ["reject", "pause", "remove"]).order("created_at", { ascending: false }).limit(1).maybeSingle()
    : { data: null };
  const { error } = await supabase.from("appeals").insert({ user_id: user.id, listing_id: input.listingId ?? null, moderation_action_id: action?.id ?? null, message: msg });
  if (error) return fail(translateDbError(error.message));
  revalidatePath("/account/listings");
  return succeed(undefined, "הערעור נשלח. נחזור אליך לאחר בדיקה.");
}
