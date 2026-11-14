import "server-only";
import { createSupabaseServerClient, createSupabaseAdminClient } from "@/lib/supabase/server";
import { commercialValuationProvider } from "@/lib/providers/commercial";
import type { Enums } from "@/lib/database.types";

export type ValuationInput = {
  make_id?: string | null; model_id: string; trim_id?: string | null; year: number; mileage_km?: number | null;
  fuel_type?: Enums<"fuel_type"> | null; transmission?: Enums<"transmission_type"> | null; engine_cc?: number | null;
  ownership_count?: number | null; ownership_type?: Enums<"ownership_type"> | null; condition?: Enums<"vehicle_condition"> | null;
  known_damage?: boolean | null; maintenance?: "full" | "partial" | "unknown" | null; equipment_count?: number | null;
  exclude_listing_id?: string | null; asking_price?: number | null;
};

export type ValuationSourceResult = {
  key: string;
  label: string;                  // Hebrew label, e.g. 'מחירי פרסום של מודעות דומות'
  status: "ok" | "insufficient_data" | "not_configured" | "error";
  low?: number; mid?: number; high?: number;
  confidence: Enums<"confidence_level">;
  comparableCount: number;
  factors: { label: string; effect: string }[];
  limitations: string[];
  disclaimer: string;
  calculatedAt: string;
  windowDays?: number;
};

export type ValuationResult = {
  input: ValuationInput;
  sources: ValuationSourceResult[];
  askingPriceContext?: { label: string; position: "below" | "within" | "above"; diffPct: number } | null;
  calculatedAt: string;
};

const round = (n: number) => Math.round(n / 500) * 500;
const quantile = (sorted: number[], q: number) => {
  const pos = (sorted.length - 1) * q;
  const base = Math.floor(pos);
  const rest = pos - base;
  return sorted[base + 1] != null ? sorted[base]! + rest * (sorted[base + 1]! - sorted[base]!) : sorted[base]!;
};

/**
 * Internal source: asking prices of similar listings on this platform.
 * This is NOT a transaction price. Produces a range only when enough comparables exist.
 */
async function internalListingsSource(input: ValuationInput): Promise<ValuationSourceResult> {
  const supabase = (await createSupabaseServerClient()) ?? createSupabaseAdminClient();
  const calculatedAt = new Date().toISOString();
  const base: Omit<ValuationSourceResult, "status" | "confidence" | "comparableCount"> = {
    key: "internal_listings",
    label: "מחירי פרסום של מודעות דומות",
    factors: [],
    limitations: ["מדובר במחירים מבוקשים במודעות, לא במחירי עסקאות שבוצעו.", "הטווח משקף מודעות באותו דגם בטווח של שנה מעלה/מטה."],
    disclaimer: "מדובר במחירי פרסום (מחירים מבוקשים) ולא במחירי עסקאות שבוצעו בפועל. אין לראות בטווח הערכת שווי מחייבת.",
    calculatedAt,
  };
  if (!supabase) return { ...base, status: "error", confidence: "none", comparableCount: 0 };
  const { data: settings } = await supabase.from("vehicle_valuation_sources").select("config, enabled").eq("key", "internal_listings").maybeSingle();
  const cfg = (settings?.config ?? {}) as { min_comparables?: number; window_days?: number };
  const minComparables = cfg.min_comparables ?? 5;
  const windowDays = cfg.window_days ?? 120;
  if (settings && settings.enabled === false) return { ...base, status: "not_configured", confidence: "none", comparableCount: 0, windowDays };

  const { data, error } = await supabase.rpc("comparable_listings", { p_model: input.model_id, p_year: input.year, p_km: input.mileage_km ?? null as unknown as number, p_window_days: windowDays, p_exclude: input.exclude_listing_id ?? null as unknown as string });
  if (error) return { ...base, status: "error", confidence: "none", comparableCount: 0, windowDays };
  const rows = (data ?? []).filter((r) => r.price > 0);
  if (rows.length < minComparables) {
    return { ...base, status: "insufficient_data", confidence: "none", comparableCount: rows.length, windowDays, limitations: [...base.limitations, `נדרשות לפחות ${minComparables} מודעות דומות כדי לחשב טווח. נמצאו ${rows.length}.`] };
  }
  const prices = rows.map((r) => r.price).sort((a, b) => a - b);
  const low = round(quantile(prices, 0.25));
  const mid = round(quantile(prices, 0.5));
  const high = round(quantile(prices, 0.75));
  const confidence: Enums<"confidence_level"> = rows.length >= 20 ? "high" : rows.length >= 10 ? "medium" : "low";
  const factors: ValuationSourceResult["factors"] = [
    { label: "שנת ייצור", effect: `הושוו רכבים משנים ${input.year - 1}–${input.year + 1}` },
  ];
  if (input.mileage_km != null) {
    const avgKm = rows.reduce((s, r) => s + (r.mileage_km ?? 0), 0) / rows.length;
    factors.push({ label: "קילומטראז׳", effect: input.mileage_km < avgKm * 0.8 ? "נמוך מהממוצע במודעות הדומות – נוטה לחלק הגבוה של הטווח" : input.mileage_km > avgKm * 1.2 ? "גבוה מהממוצע במודעות הדומות – נוטה לחלק הנמוך של הטווח" : "דומה לממוצע במודעות הדומות" });
  }
  if (input.ownership_count != null) factors.push({ label: "מספר ידיים", effect: input.ownership_count === 1 ? "יד ראשונה – בדרך כלל יתרון במחיר" : `יד ${input.ownership_count}` });
  if (input.ownership_type && input.ownership_type !== "private") factors.push({ label: "סוג בעלות", effect: "רכב שהיה בליסינג/השכרה/חברה נוטה להימכר במחיר נמוך יותר" });
  if (input.known_damage) factors.push({ label: "נזק ידוע", effect: "תאונה או תיקוני פחחות מורידים את המחיר המקובל – הטווח אינו מגלם זאת" });
  if (input.condition) factors.push({ label: "מצב הרכב", effect: "הטווח מבוסס על מודעות ללא התחשבות במצב המוצהר" });
  return { ...base, status: "ok", low, mid, high, confidence, comparableCount: rows.length, factors, windowDays };
}

async function commercialSource(): Promise<ValuationSourceResult> {
  return {
    key: "commercial_provider",
    label: "הערכת שווי מספק חיצוני",
    status: commercialValuationProvider.isConfigured() ? "error" : "not_configured",
    confidence: "none",
    comparableCount: 0,
    factors: [],
    limitations: [commercialValuationProvider.configurationHint()],
    disclaimer: "ספק הערכת שווי מסחרי טרם חובר. נדרש הסכם מסחרי.",
    calculatedAt: new Date().toISOString(),
  };
}

export async function runValuation(input: ValuationInput, opts: { persist?: { userId?: string | null; listingId?: string | null } } = {}): Promise<ValuationResult> {
  const [internal, commercial] = await Promise.all([internalListingsSource(input), commercialSource()]);
  const sources = [internal, commercial];
  let askingPriceContext: ValuationResult["askingPriceContext"] = null;
  if (input.asking_price && internal.status === "ok" && internal.low && internal.high && internal.mid) {
    const diffPct = Math.round(((input.asking_price - internal.mid) / internal.mid) * 100);
    askingPriceContext = { label: internal.label, position: input.asking_price < internal.low ? "below" : input.asking_price > internal.high ? "above" : "within", diffPct };
  }
  const result: ValuationResult = { input, sources, askingPriceContext, calculatedAt: new Date().toISOString() };
  if (opts.persist) {
    const admin = createSupabaseAdminClient();
    if (admin) {
      const { data: src } = await admin.from("vehicle_valuation_sources").select("id").eq("key", "internal_listings").maybeSingle();
      await admin.from("vehicle_valuations").insert({
        requested_by: opts.persist.userId ?? null, listing_id: opts.persist.listingId ?? null, source_id: src?.id ?? null,
        input: input as never, result: result as never, estimated_low: internal.low ?? null, estimated_mid: internal.mid ?? null, estimated_high: internal.high ?? null,
        confidence: internal.confidence, comparable_count: internal.comparableCount,
      });
    }
  }
  return result;
}
