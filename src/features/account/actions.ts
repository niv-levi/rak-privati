"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createSupabaseServerClient, getCurrentUser } from "@/lib/supabase/server";
import { fail, succeed, translateDbError, type ActionResult } from "@/lib/actions/result";
import type { TablesUpdate } from "@/lib/database.types";
import { rateLimit } from "@/lib/security/rate-limit";
import { track } from "@/lib/analytics/track";
import { recordConsent } from "@/features/consents/service";
import { getClientIp, getUserAgent } from "@/lib/security/request";
import { hashIp } from "@/lib/security/hash";

async function ctx() {
  const [user, supabase] = await Promise.all([getCurrentUser(), createSupabaseServerClient()]);
  if (!user || !supabase) return null;
  return { user, supabase };
}

// ---------------------------------------------------------------- favorites
export async function toggleFavoriteAction(listingId: string): Promise<ActionResult<{ favorited: boolean }>> {
  const c = await ctx();
  if (!c) return fail("יש להתחבר כדי לשמור רכבים.", { code: "auth" });
  if (!z.string().uuid().safeParse(listingId).success) return fail("מזהה לא תקין");
  const { data: existing } = await c.supabase.from("favorites").select("listing_id").eq("user_id", c.user.id).eq("listing_id", listingId).maybeSingle();
  if (existing) {
    await c.supabase.from("favorites").delete().eq("user_id", c.user.id).eq("listing_id", listingId);
    revalidatePath("/account/favorites");
    return succeed({ favorited: false });
  }
  const { error } = await c.supabase.from("favorites").insert({ user_id: c.user.id, listing_id: listingId });
  if (error) return fail(translateDbError(error.message));
  await track("favorite_added", { listing_id: listingId }, c.user.id);
  revalidatePath("/account/favorites");
  return succeed({ favorited: true });
}

// ------------------------------------------------------------ saved searches
const saveSearchSchema = z.object({ name: z.string().trim().min(1).max(80), query: z.record(z.string(), z.unknown()), queryString: z.string().max(2000), notify: z.boolean() });

export async function saveSearchAction(input: z.infer<typeof saveSearchSchema>): Promise<ActionResult<{ id: string }>> {
  const c = await ctx();
  if (!c) return fail("יש להתחבר כדי לשמור חיפושים.", { code: "auth" });
  const parsed = saveSearchSchema.safeParse(input);
  if (!parsed.success) return fail("פרטי החיפוש אינם תקינים");
  if (!(await rateLimit("saved_search", c.user.id, 30, 3600))) return fail("יותר מדי חיפושים נשמרו בזמן קצר.");
  const { count } = await c.supabase.from("saved_searches").select("id", { count: "exact", head: true }).eq("user_id", c.user.id);
  if ((count ?? 0) >= 20) return fail("ניתן לשמור עד 20 חיפושים. מחקו חיפוש קיים כדי להוסיף חדש.");
  const q = parsed.data.query as Record<string, unknown>;
  // Persist only filter keys (translate URL names to RPC names used by notify_saved_search_matches)
  const stored: Record<string, unknown> = {};
  const map: Record<string, string> = { make: "make_ids", model: "model_ids", district: "district_ids", city: "city_ids" };
  for (const [k, v] of Object.entries(q)) {
    if (["page", "view", "sort"].includes(k) || v == null || v === "" || v === false || (Array.isArray(v) && !v.length)) continue;
    stored[map[k] ?? k] = v;
  }
  const { data, error } = await c.supabase.from("saved_searches").insert({ user_id: c.user.id, name: parsed.data.name, query: stored as never, query_string: parsed.data.queryString, notify: parsed.data.notify }).select("id").single();
  if (error) return fail(translateDbError(error.message));
  await track("search_saved", { filters: Object.keys(stored).length }, c.user.id);
  revalidatePath("/account/searches");
  return succeed({ id: data.id });
}

export async function deleteSavedSearchAction(id: string): Promise<ActionResult> {
  const c = await ctx();
  if (!c) return fail("יש להתחבר.");
  await c.supabase.from("saved_searches").delete().eq("id", id).eq("user_id", c.user.id);
  revalidatePath("/account/searches");
  return succeed(undefined);
}

export async function toggleSavedSearchNotifyAction(id: string, notify: boolean): Promise<ActionResult> {
  const c = await ctx();
  if (!c) return fail("יש להתחבר.");
  await c.supabase.from("saved_searches").update({ notify }).eq("id", id).eq("user_id", c.user.id);
  revalidatePath("/account/searches");
  return succeed(undefined);
}

// ------------------------------------------------------------- notifications
export async function markNotificationsReadAction(ids?: string[]): Promise<ActionResult> {
  const c = await ctx();
  if (!c) return fail("יש להתחבר.");
  let q = c.supabase.from("notifications").update({ read_at: new Date().toISOString() }).eq("user_id", c.user.id).is("read_at", null);
  if (ids?.length) q = q.in("id", ids);
  await q;
  revalidatePath("/account/notifications");
  revalidatePath("/", "layout");
  return succeed(undefined);
}

// -------------------------------------------------------------------- profile
const profileSchema = z.object({
  display_name: z.string().trim().min(2, "שם קצר מדי").max(60, "שם ארוך מדי").regex(/^[\p{L}\p{M}\s'"\-.]+$/u, "השם יכול להכיל אותיות ורווחים בלבד"),
  city_id: z.string().uuid().optional().or(z.literal("")),
});

export async function updateProfileAction(_prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  const c = await ctx();
  if (!c) return fail("יש להתחבר.");
  const parsed = profileSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const i of parsed.error.issues) fieldErrors[String(i.path[0])] = i.message;
    return fail("יש לתקן את השדות המסומנים", { fieldErrors });
  }
  const { error } = await c.supabase.from("profiles").update({ display_name: parsed.data.display_name, city_id: parsed.data.city_id || null }).eq("id", c.user.id);
  if (error) return fail(translateDbError(error.message));
  revalidatePath("/account", "layout");
  return succeed(undefined, "הפרופיל עודכן");
}

const prefsSchema = z.object({ in_app: z.boolean(), email: z.boolean(), sms_important: z.boolean(), saved_search: z.boolean(), marketing: z.boolean() });

export async function updateNotificationPrefsAction(prefs: z.infer<typeof prefsSchema>): Promise<ActionResult> {
  const c = await ctx();
  if (!c) return fail("יש להתחבר.");
  const parsed = prefsSchema.safeParse(prefs);
  if (!parsed.success) return fail("העדפות לא תקינות");
  const { marketing, ...rest } = parsed.data;
  const { data: profile } = await c.supabase.from("profiles").select("marketing_consent_at").eq("id", c.user.id).single();
  const hadMarketing = !!profile?.marketing_consent_at;
  const update: TablesUpdate<"profiles"> = { notification_prefs: rest };
  if (marketing !== hadMarketing) {
    await recordConsent(c.supabase, c.user.id, "marketing", marketing, { ipHash: hashIp(await getClientIp()), userAgent: await getUserAgent() });
    update.marketing_consent_at = marketing ? new Date().toISOString() : null;
  }
  const { error } = await c.supabase.from("profiles").update(update).eq("id", c.user.id);
  if (error) return fail(translateDbError(error.message));
  revalidatePath("/account/notifications");
  return succeed(undefined, "ההעדפות נשמרו");
}

// ---------------------------------------------------------------- declaration
export async function revokeDeclarationAction(): Promise<ActionResult> {
  const c = await ctx();
  if (!c) return fail("יש להתחבר.");
  const { error } = await c.supabase.from("seller_declarations").update({ revoked_at: new Date().toISOString(), revoked_reason: "user_request" }).eq("user_id", c.user.id).is("revoked_at", null);
  if (error) return fail(translateDbError(error.message));
  await recordConsent(c.supabase, c.user.id, "private_seller_declaration", false, { ipHash: hashIp(await getClientIp()) });
  revalidatePath("/account", "layout");
  return succeed(undefined, "ההצהרה בוטלה. מודעות פעילות הושהו.");
}

// ------------------------------------------------------------ account delete
export async function deleteAccountAction(_prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  const c = await ctx();
  if (!c) return fail("יש להתחבר.");
  if (formData.get("confirm") !== "מחיקה") return fail("יש להקליד את המילה מחיקה לאישור", { fieldErrors: { confirm: "יש להקליד את המילה מחיקה" } });
  const { error } = await c.supabase.rpc("request_account_deletion");
  if (error) return fail(translateDbError(error.message));
  // Remove the auth identity as well when the service key is available (otherwise an ops job does it).
  const { createSupabaseAdminClient } = await import("@/lib/supabase/server");
  const admin = createSupabaseAdminClient();
  if (admin) {
    const { error: delErr } = await admin.auth.admin.deleteUser(c.user.id);
    if (delErr) console.error("[account] auth user deletion failed; profile already anonymized", delErr.message);
  }
  await c.supabase.auth.signOut();
  redirect("/?deleted=1");
}
