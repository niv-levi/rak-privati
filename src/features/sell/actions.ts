"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createSupabaseServerClient, getCurrentUser, createSupabaseAdminClient } from "@/lib/supabase/server";
import { fail, succeed, translateDbError, type ActionResult } from "@/lib/actions/result";
import { hashPlate } from "@/lib/security/hash";
import { parsePlate, maskPlateDigits } from "@/lib/vehicle/plate";
import { lookupVehicle } from "@/features/vehicle-check/service";
import { getClientIp, getUserAgent } from "@/lib/security/request";
import { hashIp } from "@/lib/security/hash";
import { recordConsent, PRIVATE_SELLER_DECLARATION_TEXT, getCurrentPolicyVersion } from "@/features/consents/service";
import { track } from "@/lib/analytics/track";
import { vehicleStepSchema, saleStepSchema, conditionStepSchema, contactStepSchema, officialConfirmSchema } from "./schemas";
import type { VehicleReport } from "@/lib/providers/types";
import { sha256 } from "@/lib/security/hash";

async function ownerCtx(listingId: string) {
  const [user, supabase] = await Promise.all([getCurrentUser(), createSupabaseServerClient()]);
  if (!user || !supabase) return null;
  if (!z.string().uuid().safeParse(listingId).success) return null;
  const { data: listing } = await supabase.from("listings").select("*").eq("id", listingId).eq("seller_id", user.id).maybeSingle();
  if (!listing) return null;
  return { user, supabase, listing };
}

const editable = new Set(["draft", "needs_correction"]);

function zodErrors(err: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const i of err.issues) {
    const k = String(i.path[0] ?? "form");
    if (!out[k]) out[k] = i.message;
  }
  return out;
}

/** Creates a new draft and redirects to the wizard. */
export async function createDraftAction(plate?: string): Promise<never> {
  const [user, supabase] = await Promise.all([getCurrentUser(), createSupabaseServerClient()]);
  if (!user || !supabase) redirect(`/login?next=${encodeURIComponent(plate ? `/sell?plate=${plate}` : "/sell")}`);
  const { data: profile } = await supabase.from("profiles").select("account_status").eq("id", user.id).single();
  if (profile && !["active", "warned"].includes(profile.account_status)) redirect("/account?blocked=1");
  // Reuse an existing empty draft to avoid clutter
  const { data: existing } = await supabase.from("listings").select("id").eq("seller_id", user.id).eq("status", "draft").is("plate_hash", null).order("created_at", { ascending: false }).limit(1).maybeSingle();
  let id = existing?.id;
  if (!id) {
    const { data, error } = await supabase.from("listings").insert({ seller_id: user.id, status: "draft" }).select("id").single();
    if (error || !data) redirect("/account/listings?error=create");
    id = data.id;
    await track("listing_started", {}, user.id);
  }
  redirect(`/account/listings/${id}/edit${plate ? `?plate=${encodeURIComponent(plate)}` : ""}`);
}

/** Step 1-2: plate lookup → stores plate privately, snapshots official data, prefills catalog fields. */
export async function lookupForListingAction(listingId: string, plateInput: string): Promise<ActionResult<{ report: VehicleReport; prefill: Record<string, unknown> }>> {
  const c = await ownerCtx(listingId);
  if (!c) return fail("המודעה לא נמצאה", { code: "not_found" });
  if (!editable.has(c.listing.status)) return fail("לא ניתן לשנות את מספר הרישוי של מודעה שכבר נשלחה.");
  const parsed = parsePlate(plateInput);
  if (!parsed.ok) return fail(parsed.error, { fieldErrors: { plate: parsed.error } });

  const outcome = await lookupVehicle({ plate: parsed.plate, userId: c.user.id, ip: await getClientIp(), purpose: "sell" });
  if (!outcome.ok) return fail(outcome.error, { code: outcome.code });
  const report = outcome.report;

  // Prefill from catalog using make/model aliases (never overwrite seller-entered values later)
  const prefill: Record<string, unknown> = {};
  const makeName = report.identification.make.value;
  const modelName = report.identification.commercialName.value ?? report.identification.model.value;
  if (makeName) {
    const { data: alias } = await c.supabase.from("vehicle_catalog_aliases").select("entity_id").eq("entity_type", "make").ilike("alias", makeName).maybeSingle();
    let makeId = alias?.entity_id ?? null;
    if (!makeId) {
      const { data: m } = await c.supabase.from("vehicle_makes").select("id").or(`name_he.ilike.${makeName},name_en.ilike.${makeName}`).limit(1).maybeSingle();
      makeId = m?.id ?? null;
    }
    if (makeId) {
      prefill.make_id = makeId;
      if (modelName) {
        const { data: models } = await c.supabase.from("vehicle_models").select("id, name_he, name_en").eq("make_id", makeId);
        const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9֐-׿]/g, "");
        const hit = (models ?? []).find((m) => norm(m.name_en) === norm(modelName) || norm(m.name_he) === norm(modelName)) ?? (models ?? []).find((m) => norm(modelName).includes(norm(m.name_en)) || norm(modelName).includes(norm(m.name_he)));
        if (hit) prefill.model_id = hit.id;
      }
    }
  }
  if (report.identification.year.value) prefill.year = report.identification.year.value;
  if (report.identification.color.value) prefill.color = report.identification.color.value;
  if (report.identification.trim.value) prefill.trim_name = report.identification.trim.value;
  const fuel = report.specs.fuel.value ?? "";
  if (fuel) prefill.fuel_type = /חשמל.*בנזין|בנזין.*חשמל|היבריד/.test(fuel) ? "hybrid" : /חשמל/.test(fuel) ? "electric" : /דיזל/.test(fuel) ? "diesel" : /בנזין/.test(fuel) ? "petrol" : /גפ|גז/.test(fuel) ? "lpg" : undefined;
  const own = report.registration.ownershipType.value ?? "";
  if (own) prefill.ownership_type = /פרטי/.test(own) ? "private" : /ליסינג/.test(own) ? "leasing" : /השכרה/.test(own) ? "rental" : /חברה/.test(own) ? "company" : "other";
  if (report.registration.firstOnRoad.value) prefill.first_registration_date = report.registration.firstOnRoad.value;

  const plateHash = hashPlate(parsed.plate);
  const update: Record<string, unknown> = {
    plate_hash: plateHash,
    plate_masked: maskPlateDigits(parsed.plate),
    official_data: report,
    official_data_fetched_at: report.fetchedAt,
    lookup_result_id: outcome.resultId,
    test_mileage_km: report.lastTestMileage.value,
    test_mileage_date: report.mileageHistory.records.at(-1)?.date ?? null,
    wizard_step: Math.max(c.listing.wizard_step, 2),
  };
  // Prefill only fields the seller has not filled yet
  for (const [k, v] of Object.entries(prefill)) if (v != null && (c.listing as Record<string, unknown>)[k] == null) update[k] = v;
  if (update.make_id) {
    const { data: mk } = await c.supabase.from("vehicle_makes").select("name_he").eq("id", String(update.make_id)).single();
    update.make_name = mk?.name_he ?? null;
  }
  if (update.model_id) {
    const { data: md } = await c.supabase.from("vehicle_models").select("name_he").eq("id", String(update.model_id)).single();
    update.model_name = md?.name_he ?? null;
  }
  const { error } = await c.supabase.from("listings").update(update as never).eq("id", listingId);
  if (error) return fail(translateDbError(error.message));
  const { error: pErr } = await c.supabase.from("listing_private_data").upsert({ listing_id: listingId, plate_number: parsed.plate });
  if (pErr) return fail(translateDbError(pErr.message));
  revalidatePath(`/account/listings/${listingId}/edit`);
  return succeed({ report, prefill });
}

export async function confirmOfficialDataAction(listingId: string, input: z.input<typeof officialConfirmSchema>): Promise<ActionResult> {
  const c = await ownerCtx(listingId);
  if (!c) return fail("המודעה לא נמצאה");
  const parsed = officialConfirmSchema.safeParse(input);
  if (!parsed.success) return fail("יש לתקן את השדות", { fieldErrors: zodErrors(parsed.error) });
  const { error } = await c.supabase.from("listings").update({ discrepancy_notes: parsed.data.confirmed ? null : parsed.data.discrepancy_notes, wizard_step: Math.max(c.listing.wizard_step, 3) }).eq("id", listingId);
  if (error) return fail(translateDbError(error.message));
  return succeed(undefined);
}

export async function saveVehicleStepAction(listingId: string, input: z.input<typeof vehicleStepSchema>): Promise<ActionResult> {
  const c = await ownerCtx(listingId);
  if (!c) return fail("המודעה לא נמצאה");
  const parsed = vehicleStepSchema.safeParse(input);
  if (!parsed.success) return fail("יש לתקן את השדות המסומנים", { fieldErrors: zodErrors(parsed.error) });
  const d = parsed.data;
  const [{ data: mk }, { data: md }, { data: tr }] = await Promise.all([
    c.supabase.from("vehicle_makes").select("id, name_he").eq("id", d.make_id).single(),
    c.supabase.from("vehicle_models").select("id, name_he, make_id").eq("id", d.model_id).single(),
    d.trim_id ? c.supabase.from("vehicle_trims").select("id, name_he").eq("id", d.trim_id).single() : Promise.resolve({ data: null }),
  ]);
  if (!mk || !md || md.make_id !== mk.id) return fail("הדגם אינו שייך ליצרן שנבחר", { fieldErrors: { model_id: "בחרו דגם מתאים ליצרן" } });
  const { error } = await c.supabase.from("listings").update({
    make_id: mk.id, make_name: mk.name_he, model_id: md.id, model_name: md.name_he, trim_id: tr?.id ?? null, trim_name: tr?.name_he ?? d.trim_name,
    year: d.year, mileage_km: d.mileage_km, ownership_count_declared: d.ownership_count_declared, ownership_type: d.ownership_type,
    fuel_type: d.fuel_type, transmission: d.transmission, engine_cc: d.engine_cc ?? null, body_style: d.body_style, color: d.color,
    first_registration_date: d.first_registration_date, wizard_step: Math.max(c.listing.wizard_step, 4),
  }).eq("id", listingId);
  if (error) return fail(translateDbError(error.message));
  return succeed(undefined);
}

export async function saveSaleStepAction(listingId: string, input: z.input<typeof saleStepSchema>): Promise<ActionResult> {
  const c = await ownerCtx(listingId);
  if (!c) return fail("המודעה לא נמצאה");
  const parsed = saleStepSchema.safeParse(input);
  if (!parsed.success) return fail("יש לתקן את השדות המסומנים", { fieldErrors: zodErrors(parsed.error) });
  const { data: city } = await c.supabase.from("geo_cities").select("id, district_id").eq("id", parsed.data.city_id).single();
  if (!city) return fail("העיר לא נמצאה", { fieldErrors: { city_id: "בחרו עיר מהרשימה" } });
  const { error } = await c.supabase.from("listings").update({ price: parsed.data.price, city_id: city.id, district_id: city.district_id, neighborhood: parsed.data.neighborhood, condition: parsed.data.condition, wizard_step: Math.max(c.listing.wizard_step, 5) }).eq("id", listingId);
  if (error) return fail(translateDbError(error.message));
  return succeed(undefined);
}

export async function saveConditionStepAction(listingId: string, input: z.input<typeof conditionStepSchema>): Promise<ActionResult> {
  const c = await ownerCtx(listingId);
  if (!c) return fail("המודעה לא נמצאה");
  const parsed = conditionStepSchema.safeParse(input);
  if (!parsed.success) return fail("יש לתקן את השדות המסומנים", { fieldErrors: zodErrors(parsed.error) });
  const d = parsed.data;
  const { error } = await c.supabase.from("listings").update({
    maintenance_history: d.maintenance_history, accident_declared: d.accident_declared, accident_details: d.accident_declared ? d.accident_details : null,
    body_repairs_declared: d.body_repairs_declared, body_repair_details: d.body_repairs_declared ? d.body_repair_details : null,
    equipment: d.equipment, description: d.description, wizard_step: Math.max(c.listing.wizard_step, 7),
  }).eq("id", listingId);
  if (error) return fail(translateDbError(error.message));
  return succeed(undefined);
}

export async function saveContactStepAction(listingId: string, input: z.input<typeof contactStepSchema>): Promise<ActionResult> {
  const c = await ownerCtx(listingId);
  if (!c) return fail("המודעה לא נמצאה");
  const parsed = contactStepSchema.safeParse(input);
  if (!parsed.success) return fail("יש לתקן את השדות המסומנים", { fieldErrors: zodErrors(parsed.error) });
  const d = parsed.data;
  const [{ error: pErr }, { error }] = await Promise.all([
    c.supabase.from("profiles").update({ display_name: d.display_name }).eq("id", c.user.id),
    c.supabase.from("listings").update({ contact_phone_opt_in: d.contact_phone_opt_in, contact_whatsapp_opt_in: d.contact_whatsapp_opt_in, contact_hours: d.contact_hours, wizard_step: Math.max(c.listing.wizard_step, 8) }).eq("id", listingId),
  ]);
  if (pErr || error) return fail(translateDbError((pErr ?? error)!.message));
  // Contact-sharing consent (separate from terms)
  await recordConsent(c.supabase, c.user.id, "contact_sharing", true, { ipHash: hashIp(await getClientIp()), metadata: { listing_id: listingId, phone: d.contact_phone_opt_in, whatsapp: d.contact_whatsapp_opt_in } });
  return succeed(undefined);
}

export async function acceptDeclarationAction(listingId: string, accepted: boolean): Promise<ActionResult<{ declarationId: string }>> {
  const c = await ownerCtx(listingId);
  if (!c) return fail("המודעה לא נמצאה");
  if (!accepted) return fail("יש לאשר את ההצהרה כדי להמשיך", { fieldErrors: { declaration: "יש לאשר את ההצהרה" } });
  const policy = await getCurrentPolicyVersion(c.supabase, "private_seller_declaration");
  const ipHash = hashIp(await getClientIp());
  const ua = await getUserAgent();
  // Terms/privacy re-acknowledged as part of the declaration text
  const consent = await recordConsent(c.supabase, c.user.id, "private_seller_declaration", true, { ipHash, userAgent: ua, metadata: { listing_id: listingId, text_hash: sha256(PRIVATE_SELLER_DECLARATION_TEXT) } });
  const { data: decl, error } = await c.supabase.from("seller_declarations").insert({ user_id: c.user.id, consent_record_id: consent.id, declaration_version: policy?.version ?? consent.version, declaration_text_hash: sha256(PRIVATE_SELLER_DECLARATION_TEXT) }).select("id").single();
  if (error || !decl) return fail(translateDbError(error?.message));
  const { error: lErr } = await c.supabase.from("listings").update({ declaration_id: decl.id, wizard_step: Math.max(c.listing.wizard_step, 9) }).eq("id", listingId);
  if (lErr) return fail(translateDbError(lErr.message));
  return succeed({ declarationId: decl.id });
}

export async function submitListingAction(listingId: string): Promise<ActionResult> {
  const c = await ownerCtx(listingId);
  if (!c) return fail("המודעה לא נמצאה");
  if (!editable.has(c.listing.status)) return fail("המודעה כבר נשלחה לבדיקה.");
  const { error } = await c.supabase.from("listings").update({ status: "pending_review" }).eq("id", listingId);
  if (error) return fail(translateDbError(error.message), { code: error.message });
  await track("listing_submitted", { listing_id: listingId }, c.user.id);
  // Record device/IP signal for related-account detection (salted hashes only)
  const admin = createSupabaseAdminClient();
  const ip = await getClientIp();
  if (admin && ip) await admin.from("account_signals").upsert({ user_id: c.user.id, signal_type: "ip", value_hash: hashIp(ip)!, last_seen_at: new Date().toISOString() }, { onConflict: "user_id,signal_type,value_hash" });
  revalidatePath("/account/listings");
  return succeed(undefined, "המודעה נשלחה לבדיקה. נעדכן אותך כשתאושר.");
}

/** Edits allowed on active listings: price, description, contact prefs. */
export async function updateActiveListingAction(listingId: string, input: { price: number; description: string; contact_hours?: string | null }): Promise<ActionResult> {
  const c = await ownerCtx(listingId);
  if (!c) return fail("המודעה לא נמצאה");
  const schema = z.object({ price: z.coerce.number().int().min(1000).max(5_000_000), description: z.string().trim().min(20).max(4000), contact_hours: z.string().max(120).nullable().optional() });
  const parsed = schema.safeParse(input);
  if (!parsed.success) return fail("יש לתקן את השדות", { fieldErrors: zodErrors(parsed.error) });
  const { error } = await c.supabase.from("listings").update({ price: parsed.data.price, description: parsed.data.description, contact_hours: parsed.data.contact_hours ?? null }).eq("id", listingId);
  if (error) return fail(translateDbError(error.message));
  revalidatePath(`/cars/${listingId}`);
  revalidatePath("/account/listings");
  return succeed(undefined, "המודעה עודכנה");
}
