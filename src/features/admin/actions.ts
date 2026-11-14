"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createSupabaseServerClient, getCurrentUser, createSupabaseAdminClient } from "@/lib/supabase/server";
import { getRoles, hasRole, type Role } from "@/lib/auth/guards";
import { fail, succeed, translateDbError, type ActionResult } from "@/lib/actions/result";
import { track } from "@/lib/analytics/track";
import type { Enums, Json } from "@/lib/database.types";

async function staff(...allowed: Role[]) {
  const [user, supabase, roles] = await Promise.all([getCurrentUser(), createSupabaseServerClient(), getRoles()]);
  if (!user || !supabase || !roles.length) return null;
  if (allowed.length && !hasRole(roles, ...allowed)) return null;
  return { user, supabase, roles };
}

const audit = async (s: NonNullable<Awaited<ReturnType<typeof staff>>>, action: string, entityType: string, entityId: string, before: Json | null, after: Json | null) => {
  await s.supabase.rpc("write_audit", { p_action: action, p_entity_type: entityType, p_entity_id: entityId, p_before: before as never, p_after: after as never });
};

// ------------------------------------------------------------ listings
const moderationSchema = z.object({
  listingId: z.string().uuid(),
  action: z.enum(["approve", "reject", "request_correction", "pause", "unpause", "remove", "restore", "note"]),
  reason: z.string().trim().max(500).optional(),
  notes: z.string().trim().max(2000).optional(),
});

export async function moderateListingAction(input: z.infer<typeof moderationSchema>): Promise<ActionResult> {
  const s = await staff("moderator");
  if (!s) return fail("אין הרשאה");
  const parsed = moderationSchema.safeParse(input);
  if (!parsed.success) return fail("קלט לא תקין");
  const { listingId, action, reason, notes } = parsed.data;
  const { data: before } = await s.supabase.from("listings").select("id, status, seller_id, rejection_reason, correction_notes").eq("id", listingId).maybeSingle();
  if (!before) return fail("המודעה לא נמצאה");
  if ((action === "reject" || action === "request_correction" || action === "remove") && !reason) return fail("יש לציין סיבה", { fieldErrors: { reason: "חובה" } });
  const statusMap: Record<string, Enums<"listing_status"> | null> = { approve: "active", reject: "rejected", request_correction: "needs_correction", pause: "paused", unpause: "active", remove: "removed", restore: "active", note: null };
  const nextStatus = statusMap[action];
  if (nextStatus) {
    const patch: Record<string, unknown> = { status: nextStatus, moderated_by: s.user.id, moderated_at: new Date().toISOString() };
    if (action === "reject") patch.rejection_reason = reason;
    if (action === "request_correction") patch.correction_notes = reason + (notes ? `\n${notes}` : "");
    const { error } = await s.supabase.from("listings").update(patch as never).eq("id", listingId);
    if (error) return fail(translateDbError(error.message));
  }
  await s.supabase.from("moderation_actions").insert({ listing_id: listingId, target_user_id: before.seller_id, actor_id: s.user.id, action: action as Enums<"moderation_action_type">, reason: reason ?? null, notes: notes ?? null });
  if (action === "approve" || action === "reject" || action === "remove") {
    await s.supabase.from("moderation_flags").update({ status: "resolved", resolved_by: s.user.id, resolved_at: new Date().toISOString(), resolution: `listing_${action}` }).eq("listing_id", listingId).in("status", ["open", "reviewing"]);
  }
  if (action === "approve") await track("listing_approved", { listing_id: listingId });
  await audit(s, `listing.${action}`, "listing", listingId, { status: before.status }, { status: nextStatus ?? before.status, reason: reason ?? null });
  revalidatePath("/admin/listings");
  revalidatePath(`/admin/listings/${listingId}`);
  revalidatePath(`/cars/${listingId}`);
  return succeed(undefined, "הפעולה בוצעה");
}

export async function resolveFlagAction(flagId: string, status: "resolved" | "dismissed" | "reviewing", resolution?: string): Promise<ActionResult> {
  const s = await staff("moderator");
  if (!s) return fail("אין הרשאה");
  const { error } = await s.supabase.from("moderation_flags").update({ status, resolution: resolution ?? null, resolved_by: status === "reviewing" ? null : s.user.id, resolved_at: status === "reviewing" ? null : new Date().toISOString() }).eq("id", flagId);
  if (error) return fail(translateDbError(error.message));
  await audit(s, `flag.${status}`, "moderation_flag", flagId, null, { resolution: resolution ?? null });
  revalidatePath("/admin/listings");
  return succeed(undefined);
}

// ---------------------------------------------------------------- users
const userActionSchema = z.object({
  userId: z.string().uuid(),
  action: z.enum(["warn_user", "suspend_user", "block_user", "reinstate_user", "set_review_level", "set_listing_limit", "note"]),
  reason: z.string().trim().min(2, "יש לציין סיבה").max(500),
  value: z.union([z.string(), z.number()]).optional(),
});

export async function userModerationAction(input: z.infer<typeof userActionSchema>): Promise<ActionResult> {
  const s = await staff("moderator");
  if (!s) return fail("אין הרשאה");
  const parsed = userActionSchema.safeParse(input);
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "קלט לא תקין");
  const { userId, action, reason, value } = parsed.data;
  if (userId === s.user.id) return fail("לא ניתן לבצע פעולות על החשבון של עצמך");
  const { data: target } = await s.supabase.from("profiles").select("account_status, review_level, max_active_listings").eq("id", userId).maybeSingle();
  if (!target) return fail("המשתמש לא נמצא");
  const { data: targetRoles } = await s.supabase.from("user_roles").select("role").eq("user_id", userId);
  if ((targetRoles?.length ?? 0) > 0 && !hasRole(s.roles, "super_admin")) return fail("רק מנהל ראשי יכול לפעול על חשבונות צוות");
  const patch: Record<string, unknown> = {};
  if (action === "warn_user") patch.account_status = "warned";
  if (action === "suspend_user") patch.account_status = "suspended";
  if (action === "block_user") patch.account_status = "blocked";
  if (action === "reinstate_user") patch.account_status = "active";
  if (action === "set_review_level") patch.review_level = value === "strict" ? "strict" : "standard";
  if (action === "set_listing_limit") {
    const n = value === "" || value == null ? null : Number(value);
    if (n != null && (!Number.isInteger(n) || n < 0 || n > 50)) return fail("מגבלה לא תקינה (0–50)");
    patch.max_active_listings = n;
  }
  if (Object.keys(patch).length) {
    patch.status_reason = reason;
    patch.status_changed_at = new Date().toISOString();
    const { error } = await s.supabase.from("profiles").update(patch as never).eq("id", userId);
    if (error) return fail(translateDbError(error.message));
  }
  await s.supabase.from("moderation_actions").insert({ target_user_id: userId, actor_id: s.user.id, action: action as Enums<"moderation_action_type">, reason, metadata: { value: value ?? null } as never });
  if (action === "block_user" || action === "suspend_user" || action === "warn_user") {
    await s.supabase.from("notifications").insert({ user_id: userId, type: "account", title: action === "warn_user" ? "קיבלת אזהרה" : action === "suspend_user" ? "החשבון שלך הושעה" : "החשבון שלך נחסם", body: reason + " ניתן להגיש ערעור מעמוד המודעות שלך.", href: "/account/listings" }).then(() => undefined, () => undefined);
  }
  await audit(s, `user.${action}`, "profile", userId, target as unknown as Json, { ...patch, reason } as Json);
  revalidatePath("/admin/users");
  revalidatePath(`/admin/users/${userId}`);
  return succeed(undefined, "הפעולה בוצעה");
}

export async function grantRoleAction(userId: string, role: Role): Promise<ActionResult> {
  const s = await staff("super_admin");
  if (!s) return fail("אין הרשאה");
  const { error } = await s.supabase.from("user_roles").insert({ user_id: userId, role });
  if (error) return fail(translateDbError(error.message));
  await audit(s, "role.grant", "user_roles", userId, null, { role });
  revalidatePath(`/admin/users/${userId}`);
  return succeed(undefined, "התפקיד הוענק");
}

export async function revokeRoleAction(userId: string, role: Role): Promise<ActionResult> {
  const s = await staff("super_admin");
  if (!s) return fail("אין הרשאה");
  if (userId === s.user.id) return fail("לא ניתן להסיר תפקיד מעצמך");
  const { error } = await s.supabase.from("user_roles").delete().eq("user_id", userId).eq("role", role);
  if (error) return fail(translateDbError(error.message));
  await audit(s, "role.revoke", "user_roles", userId, { role }, null);
  revalidatePath(`/admin/users/${userId}`);
  return succeed(undefined, "התפקיד הוסר");
}

// -------------------------------------------------------------- reports
export async function resolveReportAction(reportId: string, status: "resolved" | "dismissed" | "reviewing", notes?: string): Promise<ActionResult> {
  const s = await staff("moderator");
  if (!s) return fail("אין הרשאה");
  const { error } = await s.supabase.from("listing_reports").update({ status, resolution_notes: notes ?? null, resolved_by: status === "reviewing" ? null : s.user.id, resolved_at: status === "reviewing" ? null : new Date().toISOString() }).eq("id", reportId);
  if (error) return fail(translateDbError(error.message));
  await audit(s, `report.${status}`, "listing_report", reportId, null, { notes: notes ?? null });
  revalidatePath("/admin/reports");
  return succeed(undefined);
}

export async function decideAppealAction(appealId: string, accepted: boolean, notes: string, restoreListing: boolean): Promise<ActionResult> {
  const s = await staff("moderator");
  if (!s) return fail("אין הרשאה");
  if (!notes.trim()) return fail("יש לכתוב נימוק שיוצג למשתמש");
  const { data: appeal } = await s.supabase.from("appeals").select("id, user_id, listing_id").eq("id", appealId).maybeSingle();
  if (!appeal) return fail("הערעור לא נמצא");
  const { error } = await s.supabase.from("appeals").update({ status: accepted ? "accepted" : "rejected", decided_by: s.user.id, decided_at: new Date().toISOString(), decision_notes: notes }).eq("id", appealId);
  if (error) return fail(translateDbError(error.message));
  if (accepted && restoreListing && appeal.listing_id) {
    await s.supabase.from("listings").update({ status: "active", moderated_by: s.user.id, rejection_reason: null }).eq("id", appeal.listing_id);
  }
  if (accepted && !appeal.listing_id) {
    await s.supabase.from("profiles").update({ account_status: "active", status_reason: "appeal_accepted" }).eq("id", appeal.user_id);
  }
  await s.supabase.from("moderation_actions").insert({ listing_id: appeal.listing_id, target_user_id: appeal.user_id, actor_id: s.user.id, action: accepted ? "appeal_accepted" : "appeal_rejected", reason: notes });
  await s.supabase.from("notifications").insert({ user_id: appeal.user_id, type: "account", title: accepted ? "הערעור שלך התקבל" : "הערעור שלך נדחה", body: notes, href: "/account/listings" });
  await audit(s, accepted ? "appeal.accept" : "appeal.reject", "appeal", appealId, null, { notes, restoreListing });
  revalidatePath("/admin/reports");
  return succeed(undefined, "ההחלטה נרשמה");
}

// ------------------------------------------------------------- settings
export async function updateSettingAction(key: string, value: string): Promise<ActionResult> {
  const s = await staff("super_admin");
  if (!s) return fail("אין הרשאה");
  let json: Json;
  try { json = JSON.parse(value) as Json; } catch { json = value; }
  const { data: before } = await s.supabase.from("application_settings").select("value").eq("key", key).maybeSingle();
  const { error } = await s.supabase.from("application_settings").update({ value: json as never, updated_by: s.user.id, updated_at: new Date().toISOString() }).eq("key", key);
  if (error) return fail(translateDbError(error.message));
  await audit(s, "settings.update", "application_settings", key, before?.value ?? null, json);
  revalidatePath("/admin/settings");
  return succeed(undefined, "ההגדרה נשמרה");
}

// ------------------------------------------------------------ providers
export async function toggleProviderAction(key: string, enabled: boolean): Promise<ActionResult> {
  const s = await staff("data_manager");
  if (!s) return fail("אין הרשאה");
  const { error } = await s.supabase.from("vehicle_data_sources").update({ enabled, status: enabled ? undefined : "disabled" }).eq("key", key);
  if (error) return fail(translateDbError(error.message));
  await audit(s, "provider.toggle", "vehicle_data_source", key, null, { enabled });
  revalidatePath("/admin/vehicle-data");
  return succeed(undefined);
}

export async function testProviderLookupAction(plate: string): Promise<ActionResult<{ summary: string }>> {
  const s = await staff("data_manager");
  if (!s) return fail("אין הרשאה");
  const { lookupVehicle } = await import("@/features/vehicle-check/service");
  const r = await lookupVehicle({ plate, userId: s.user.id, ip: null, purpose: "check" });
  if (!r.ok) return fail(r.error);
  await s.supabase.from("vehicle_data_sync_runs").insert({ source_id: (await s.supabase.from("vehicle_data_sources").select("id").eq("key", "gov_il_vehicles").single()).data!.id, status: r.report.sources[0]?.status === "unavailable" ? "failed" : "succeeded", finished_at: new Date().toISOString(), rows_processed: 1, notes: `manual test by staff; status=${r.report.overallStatus}`, triggered_by: s.user.id }).then(() => undefined, () => undefined);
  revalidatePath("/admin/vehicle-data");
  return succeed({ summary: r.report.sources.map((x) => `${x.name}: ${x.status}${x.error ? ` (${x.error})` : ""}`).join(" | ") });
}

export async function updateValuationSourceAction(key: string, patch: { enabled?: boolean; min_comparables?: number; window_days?: number; priority?: number }): Promise<ActionResult> {
  const s = await staff("data_manager");
  if (!s) return fail("אין הרשאה");
  const { data: row } = await s.supabase.from("vehicle_valuation_sources").select("config").eq("key", key).maybeSingle();
  if (!row) return fail("המקור לא נמצא");
  const cfg = { ...(row.config as Record<string, unknown>) };
  if (patch.min_comparables != null) cfg.min_comparables = Math.max(3, Math.min(50, patch.min_comparables));
  if (patch.window_days != null) cfg.window_days = Math.max(14, Math.min(365, patch.window_days));
  const { error } = await s.supabase.from("vehicle_valuation_sources").update({ config: cfg as never, ...(patch.enabled != null ? { enabled: patch.enabled } : {}), ...(patch.priority != null ? { priority: patch.priority } : {}) }).eq("key", key);
  if (error) return fail(translateDbError(error.message));
  await audit(s, "valuation_source.update", "vehicle_valuation_source", key, row.config, { ...cfg, ...patch });
  revalidatePath("/admin/valuations");
  return succeed(undefined, "נשמר");
}

// -------------------------------------------------------------- catalog
export async function upsertMakeAction(input: { slug: string; name_he: string; name_en: string; is_popular: boolean }): Promise<ActionResult> {
  const s = await staff("data_manager");
  if (!s) return fail("אין הרשאה");
  const schema = z.object({ slug: z.string().regex(/^[a-z0-9-]{2,40}$/, "slug באותיות לטיניות קטנות"), name_he: z.string().min(1).max(60), name_en: z.string().min(1).max(60), is_popular: z.boolean() });
  const parsed = schema.safeParse(input);
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "קלט לא תקין");
  const { error } = await s.supabase.from("vehicle_makes").upsert(parsed.data, { onConflict: "slug" });
  if (error) return fail(translateDbError(error.message));
  await audit(s, "catalog.make.upsert", "vehicle_make", parsed.data.slug, null, parsed.data);
  revalidatePath("/admin/catalog");
  return succeed(undefined, "היצרן נשמר");
}

export async function upsertModelAction(input: { make_id: string; slug: string; name_he: string; name_en: string; category?: string; body_style?: string; is_popular: boolean }): Promise<ActionResult> {
  const s = await staff("data_manager");
  if (!s) return fail("אין הרשאה");
  const schema = z.object({ make_id: z.string().uuid(), slug: z.string().regex(/^[a-z0-9-]{1,40}$/), name_he: z.string().min(1).max(60), name_en: z.string().min(1).max(60), category: z.string().max(30).optional(), body_style: z.enum(["sedan", "hatchback", "suv", "crossover", "station_wagon", "coupe", "convertible", "mpv", "minivan", "pickup", "other"]).optional(), is_popular: z.boolean() });
  const parsed = schema.safeParse(input);
  if (!parsed.success) return fail("קלט לא תקין");
  const { error } = await s.supabase.from("vehicle_models").upsert({ ...parsed.data, category: parsed.data.category || null, body_style: parsed.data.body_style ?? null }, { onConflict: "make_id,slug" });
  if (error) return fail(translateDbError(error.message));
  await audit(s, "catalog.model.upsert", "vehicle_model", parsed.data.slug, null, parsed.data);
  revalidatePath("/admin/catalog");
  return succeed(undefined, "הדגם נשמר");
}

/** CSV import: make_slug,make_he,make_en,model_slug,model_he,model_en,category,body_style */
export async function importCatalogCsvAction(csv: string): Promise<ActionResult<{ inserted: number; updated: number; skipped: number }>> {
  const s = await staff("data_manager");
  if (!s) return fail("אין הרשאה");
  if (csv.length > 2_000_000) return fail("הקובץ גדול מדי");
  const lines = csv.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  if (lines.length < 2) return fail("הקובץ ריק או ללא שורת כותרת");
  const header = lines[0]!.split(",").map((h) => h.trim().toLowerCase());
  const need = ["make_slug", "make_he", "make_en", "model_slug", "model_he", "model_en"];
  if (!need.every((n) => header.includes(n))) return fail(`שורת הכותרת חייבת לכלול: ${need.join(", ")}`);
  const idx = Object.fromEntries(header.map((h, i) => [h, i]));
  const { data: run } = await s.supabase.from("catalog_import_runs").insert({ source: "csv_upload", rows_received: lines.length - 1, created_by: s.user.id }).select("id").single();
  let inserted = 0, updated = 0, skipped = 0;
  const makeCache = new Map<string, string>();
  for (const line of lines.slice(1)) {
    const cols = line.split(",").map((c) => c.trim());
    const get = (k: string) => cols[idx[k]!] ?? "";
    const makeSlug = get("make_slug").toLowerCase();
    if (!/^[a-z0-9-]+$/.test(makeSlug) || !get("model_slug")) { skipped++; continue; }
    let makeId = makeCache.get(makeSlug);
    if (!makeId) {
      const { data: mk } = await s.supabase.from("vehicle_makes").upsert({ slug: makeSlug, name_he: get("make_he") || makeSlug, name_en: get("make_en") || makeSlug }, { onConflict: "slug", ignoreDuplicates: false }).select("id").single();
      if (!mk) { skipped++; continue; }
      makeId = mk.id; makeCache.set(makeSlug, makeId);
    }
    const modelSlug = get("model_slug").toLowerCase();
    const { data: existing } = await s.supabase.from("vehicle_models").select("id").eq("make_id", makeId).eq("slug", modelSlug).maybeSingle();
    const body = get("body_style");
    const { error } = await s.supabase.from("vehicle_models").upsert({ make_id: makeId, slug: modelSlug, name_he: get("model_he") || modelSlug, name_en: get("model_en") || modelSlug, category: get("category") || null, body_style: (["sedan", "hatchback", "suv", "crossover", "station_wagon", "coupe", "convertible", "mpv", "minivan", "pickup", "other"].includes(body) ? body : null) as never }, { onConflict: "make_id,slug" });
    if (error) skipped++; else if (existing) updated++; else inserted++;
  }
  if (run) await s.supabase.from("catalog_import_runs").update({ rows_inserted: inserted, rows_updated: updated, rows_skipped: skipped, status: "succeeded", finished_at: new Date().toISOString() }).eq("id", run.id);
  await audit(s, "catalog.import", "catalog_import_run", run?.id ?? "n/a", null, { inserted, updated, skipped });
  revalidatePath("/admin/catalog");
  return succeed({ inserted, updated, skipped }, `יובאו ${inserted} חדשים, עודכנו ${updated}, דולגו ${skipped}`);
}

/** Runs the expiry job on demand (super admin). */
export async function runExpiryNowAction(): Promise<ActionResult<{ expired: number }>> {
  const s = await staff("super_admin");
  if (!s) return fail("אין הרשאה");
  const admin = createSupabaseAdminClient();
  if (!admin) return fail("מפתח השירות אינו מוגדר בשרת");
  const { data, error } = await admin.rpc("expire_listings");
  if (error) return fail(translateDbError(error.message));
  await audit(s, "jobs.expire_listings", "job", "expire_listings", null, { expired: data });
  revalidatePath("/admin");
  return succeed({ expired: data ?? 0 }, `${data ?? 0} מודעות פגו`);
}
