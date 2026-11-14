import "server-only";
import { createSupabaseAdminClient } from "@/lib/supabase/server";
import { hashPlate, hashIp } from "@/lib/security/hash";
import { parsePlate, maskPlateDigits } from "@/lib/vehicle/plate";
import { rateLimit } from "@/lib/security/rate-limit";
import { govVehiclesProvider, govHistoryProvider, govRecallsProvider, recordProviderOutcome } from "@/lib/providers/registry";
import { REPORT_DISCLAIMER, type AttributedField, type DataStatus, type SourceRef, type VehicleReport } from "@/lib/providers/types";
import type { GovVehicleRecord } from "@/lib/providers/gov-il/vehicles";
import { track } from "@/lib/analytics/track";

export type LookupOutcome =
  | { ok: true; report: VehicleReport; resultId: string | null; cached: boolean; plate: string }
  | { ok: false; error: string; code: "invalid" | "rate_limited" | "unavailable" };

const CACHE_HOURS = 24;

function field<T>(value: T | null | undefined, source: SourceRef | undefined, raw?: unknown): AttributedField<T> {
  if (value == null) return { value: null, status: source ? "not_found" : "not_configured" };
  return { value, status: "available", source, raw: raw == null ? undefined : String(raw) };
}

function worst(statuses: DataStatus[]): DataStatus {
  const order: DataStatus[] = ["available", "partial", "needs_review", "not_found", "unavailable", "not_configured"];
  if (statuses.includes("available") && statuses.some((s) => s !== "available")) return "partial";
  return statuses.sort((a, b) => order.indexOf(a) - order.indexOf(b))[0] ?? "not_configured";
}

export function buildReport(plate: string, parts: {
  vehicle: Awaited<ReturnType<typeof govVehiclesProvider.lookup>>;
  history: Awaited<ReturnType<typeof govHistoryProvider.lookup>>;
  recalls: Awaited<ReturnType<typeof govRecallsProvider.lookup>>;
}): VehicleReport {
  const now = new Date().toISOString();
  const v = parts.vehicle.data;
  const vs = parts.vehicle.status === "available" ? parts.vehicle.source : undefined;
  const h = parts.history.data;
  const hs = parts.history.status === "available" || parts.history.status === "partial" ? parts.history.source : undefined;
  const ns = (s: DataStatus) => (s === "available" ? "not_found" : s); // field status when a source responded but the field is empty

  const f = <T,>(val: T | null | undefined, raw?: unknown): AttributedField<T> => (vs ? (val == null ? { value: null, status: "not_found" } : field(val, vs, raw)) : { value: null, status: ns(parts.vehicle.status) });

  const warnings: VehicleReport["warnings"] = [];
  const conflicts: VehicleReport["conflicts"] = [];
  const missing: string[] = [];

  // Latest test mileage: from history when available
  const lastKm = h?.mileage.length ? h.mileage[h.mileage.length - 1] : null;
  const lastTestMileage: AttributedField<number> = lastKm ? { value: lastKm.km, status: "available", source: hs, note: "נסועה שנרשמה בטסט האחרון – אינה בהכרח הנסועה הנוכחית" } : { value: null, status: ns(parts.history.status) };

  // Registration validity warning
  if (v?.registrationValidUntil && v.registrationValidUntil < now.slice(0, 10)) warnings.push({ level: "warning", text: "תוקף הרישוי שנרשם במקור חלף. יש לוודא מול המוכר שהרכב עבר טסט." });
  if (v?.ownershipType && /ליסינג|השכרה|חברה/.test(v.ownershipType)) warnings.push({ level: "info", text: `סוג הבעלות הרשום במקור הוא "${v.ownershipType}". רכבים כאלה נמכרים לעיתים דרך גופים מסחריים – בדקו שהמוכר אכן פרטי.` });
  if (h && h.ownership.length >= 3) warnings.push({ level: "info", text: "נרשמו מספר שינויי סוג בעלות. מספר הרשומות אינו בהכרח מספר הבעלים המדויק." });
  if (h && h.mileage.length >= 2) {
    for (let i = 1; i < h.mileage.length; i++) {
      if (h.mileage[i]!.km < h.mileage[i - 1]!.km) {
        warnings.push({ level: "warning", text: "נמצאה ירידה בנסועה בין טסטים עוקבים. ייתכן שמדובר בטעות הקלדה במקור או בבעיה שדורשת בירור." });
        break;
      }
    }
  }
  if (parts.recalls.status === "available" && parts.recalls.data?.length) warnings.push({ level: "info", text: "קיימות קריאות שירות (ריקול) לרכב זה. יש לוודא שטופלו במוסך מורשה." });

  // Conflict example: year of manufacture vs first-on-road year differing by more than 1
  if (v?.year && v.firstOnRoad) {
    const roadYear = Number(v.firstOnRoad.slice(0, 4));
    if (Number.isFinite(roadYear) && Math.abs(roadYear - v.year) > 1) {
      conflicts.push({ field: "שנת ייצור", values: [{ source: "שנת ייצור במאגר", value: String(v.year) }, { source: "מועד עלייה לכביש", value: v.firstOnRoad }] });
    }
  }

  if (!v) missing.push("זיהוי הרכב ונתונים טכניים");
  if (!h?.mileage.length) missing.push("היסטוריית נסועה");
  if (!h?.ownership.length) missing.push("היסטוריית בעלויות");
  if (parts.recalls.status !== "available") missing.push("מידע על קריאות שירות");
  missing.push("היסטוריית תאונות וביטוח (נדרש ספק מסחרי)");

  const sources: VehicleReport["sources"] = [
    { key: govVehiclesProvider.key, name: govVehiclesProvider.nameHe, status: parts.vehicle.status, durationMs: parts.vehicle.durationMs, error: parts.vehicle.error },
    { key: govHistoryProvider.key, name: govHistoryProvider.nameHe, status: parts.history.status, durationMs: parts.history.durationMs, error: parts.history.error },
    { key: govRecallsProvider.key, name: govRecallsProvider.nameHe, status: parts.recalls.status, durationMs: parts.recalls.durationMs, error: parts.recalls.error },
  ];

  return {
    version: 1,
    plateMasked: maskPlateDigits(plate),
    fetchedAt: now,
    overallStatus: worst([parts.vehicle.status, parts.history.status, parts.recalls.status]),
    identification: {
      make: f(v?.makeName), model: f(v?.modelName), trim: f(v?.trimLevel), commercialName: f(v?.commercialName), year: f(v?.year),
      color: f(v?.color), bodyStyle: f(v?.bodyStyle), makeCode: f(v?.makeCode), modelCode: f(v?.modelCode),
    },
    specs: {
      engineModel: f(v?.engineModel), engineCc: { value: null, status: vs ? "not_found" : ns(parts.vehicle.status), note: "נפח המנוע אינו מופיע במאגר הרישוי; מוזן על ידי המוכר" },
      fuel: f(v?.fuel), transmission: { value: null, status: vs ? "not_found" : ns(parts.vehicle.status), note: "סוג תיבת ההילוכים אינו מופיע במאגר הרישוי; מוזן על ידי המוכר" },
      pollutionGroup: f(v?.pollutionGroup), safetyLevel: f(v?.safetyLevel), frontTires: f(v?.frontTires), rearTires: f(v?.rearTires),
    },
    registration: {
      firstOnRoad: f(v?.firstOnRoad), ownershipType: f(v?.ownershipType), registrationValidUntil: f(v?.registrationValidUntil),
      lastTestDate: f(v?.lastTestDate), registrationInstruction: f(v?.registrationInstruction), vinSuffix: f(v?.vinSuffix),
    },
    lastTestMileage,
    mileageHistory: { status: h?.mileage.length ? "available" : ns(parts.history.status), records: (h?.mileage ?? []).map((m) => ({ date: m.date, km: m.km, source: hs!, kind: "test" as const })), source: hs },
    ownershipHistory: { status: h?.ownership.length ? "available" : ns(parts.history.status), records: (h?.ownership ?? []).map((o) => ({ date: o.date, ownershipType: o.ownershipType, source: hs! })), source: hs, note: "היסטוריית בעלויות מתועדת במקור. מספר הרשומות אינו בהכרח מספר הבעלים המדויק." },
    recalls: { status: parts.recalls.status, records: parts.recalls.data ?? [], source: parts.recalls.source },
    warnings, conflicts, missing, sources,
    disclaimer: REPORT_DISCLAIMER,
  };
}

export async function lookupVehicle(input: { plate: string; userId: string | null; ip: string | null; purpose: "check" | "sell" }): Promise<LookupOutcome> {
  const parsed = parsePlate(input.plate);
  if (!parsed.ok) return { ok: false, error: parsed.error, code: "invalid" };
  const plate = parsed.plate;
  const plateHash = hashPlate(plate);
  const admin = createSupabaseAdminClient();

  // Rate limits (guest by IP, user by id)
  const key = input.userId ? `user:${input.userId}` : `ip:${input.ip ?? "unknown"}`;
  const limit = input.userId ? 20 : 5;
  if (!(await rateLimit(input.userId ? "lookup_user" : "lookup_guest", key, limit, 3600))) {
    return { ok: false, error: input.userId ? "ביצעת יותר מדי בדיקות בשעה האחרונה. נסו שוב מאוחר יותר." : "הגעת למספר הבדיקות המרבי לאורחים. התחברו כדי לבצע בדיקות נוספות.", code: "rate_limited" };
  }
  await track("vehicle_lookup_requested", { purpose: input.purpose, authenticated: !!input.userId }, input.userId);

  // Fresh cached result?
  if (admin) {
    const since = new Date(Date.now() - CACHE_HOURS * 3600 * 1000).toISOString();
    const { data: cached } = await admin.from("vehicle_lookup_results").select("id, report, owner_id").eq("plate_hash", plateHash).gte("fetched_at", since).order("fetched_at", { ascending: false }).limit(1).maybeSingle();
    if (cached && (cached.report as unknown as VehicleReport)?.version === 1 && (cached.report as unknown as VehicleReport).overallStatus !== "unavailable") {
      const resultId = await persistResult(admin, { plate, plateHash, report: cached.report as unknown as VehicleReport, userId: input.userId, ip: input.ip, purpose: input.purpose, durationMs: 0, reuseOf: cached.id });
      return { ok: true, report: cached.report as unknown as VehicleReport, resultId, cached: true, plate };
    }
  }

  const started = Date.now();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 12000);
  let vehicle, history, recalls;
  try {
    [vehicle, history, recalls] = await Promise.all([
      govVehiclesProvider.lookup(plate, controller.signal).catch((e) => ({ status: "unavailable" as const, data: null, durationMs: Date.now() - started, error: String(e) })),
      govHistoryProvider.lookup(plate, controller.signal).catch((e) => ({ status: "unavailable" as const, data: null, durationMs: Date.now() - started, error: String(e) })),
      govRecallsProvider.lookup(plate, controller.signal).catch((e) => ({ status: "unavailable" as const, data: null, durationMs: Date.now() - started, error: String(e) })),
    ]);
  } finally {
    clearTimeout(timer);
  }
  void recordProviderOutcome(govVehiclesProvider.key, vehicle.status !== "unavailable" && vehicle.status !== "not_configured", vehicle.error);
  void recordProviderOutcome(govHistoryProvider.key, history.status !== "unavailable" && history.status !== "not_configured", history.error);
  void recordProviderOutcome(govRecallsProvider.key, recalls.status !== "unavailable" && recalls.status !== "not_configured", recalls.error);

  const report = buildReport(plate, { vehicle, history, recalls });
  const resultId = admin ? await persistResult(admin, { plate, plateHash, report, userId: input.userId, ip: input.ip, purpose: input.purpose, durationMs: Date.now() - started }) : null;
  await track("vehicle_lookup_completed", { purpose: input.purpose, status: report.overallStatus, duration_ms: Date.now() - started }, input.userId);
  return { ok: true, report, resultId, cached: false, plate };
}

async function persistResult(admin: NonNullable<ReturnType<typeof createSupabaseAdminClient>>, p: { plate: string; plateHash: string; report: VehicleReport; userId: string | null; ip: string | null; purpose: "check" | "sell"; durationMs: number; reuseOf?: string }): Promise<string | null> {
  try {
    const { data: req } = await admin.from("vehicle_lookup_requests").insert({ plate_hash: p.plateHash, plate_masked: p.report.plateMasked, requested_by: p.userId, ip_hash: hashIp(p.ip), purpose: p.purpose, status: p.report.overallStatus, duration_ms: p.durationMs }).select("id").single();
    const { data: res } = await admin.from("vehicle_lookup_results").insert({ request_id: req?.id ?? null, plate_hash: p.plateHash, plate_number: p.plate, report: p.report as never, overall_status: p.report.overallStatus, sources_used: p.report.sources as never, owner_id: p.userId, fetched_at: p.report.fetchedAt }).select("id").single();
    return res?.id ?? null;
  } catch (e) {
    console.error("[lookup] persist failed", e);
    return null;
  }
}

/** Loads a saved result the current user may access (RLS enforced through the user's client). */
export type SavedLookup = { id: string; report: VehicleReport; fetched_at: string; owner_id: string | null; plate_number: string };
