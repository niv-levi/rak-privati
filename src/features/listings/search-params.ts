import { z } from "zod";

/** Marketplace filter model. Kept flat so it round-trips through URL query params. */
export const sortOptions = [
  { value: "newest", label: "החדשות ביותר" },
  { value: "price_asc", label: "מחיר: מהנמוך לגבוה" },
  { value: "price_desc", label: "מחיר: מהגבוה לנמוך" },
  { value: "km_asc", label: "קילומטראז׳ נמוך" },
  { value: "year_desc", label: "שנה חדשה" },
  { value: "reduced", label: "ירידת מחיר לאחרונה" },
  { value: "relevance", label: "רלוונטיות" },
] as const;
export type SortValue = (typeof sortOptions)[number]["value"];

const list = z.preprocess((v) => (v == null || v === "" ? undefined : Array.isArray(v) ? v : String(v).split(",").filter(Boolean)), z.array(z.string().min(1)).max(30).optional());
const int = z.preprocess((v) => (v == null || v === "" ? undefined : Number(v)), z.number().int().nonnegative().optional());
const bool = z.preprocess((v) => v === "1" || v === "true" || v === "on", z.boolean().optional());

export const searchFiltersSchema = z.object({
  q: z.string().trim().max(80).optional(),
  make: list,
  model: list,
  trim: list,
  year_min: int,
  year_max: int,
  price_min: int,
  price_max: int,
  km_min: int,
  km_max: int,
  owners_max: int,
  engine_min: int,
  engine_max: int,
  fuel: list,
  transmission: list,
  body: list,
  ownership: list,
  condition: list,
  category: list,
  district: list,
  region: list,
  city: list,
  radius_city: z.string().uuid().optional(),
  radius_km: int,
  recent_days: int,
  price_reduced: bool,
  has_official_data: bool,
  sort: z.enum(sortOptions.map((s) => s.value) as [SortValue, ...SortValue[]]).default("newest"),
  page: z.preprocess((v) => (v == null || v === "" ? 1 : Number(v)), z.number().int().min(1).max(500)).default(1),
  view: z.enum(["grid", "list"]).default("grid"),
});

export type SearchFilters = z.infer<typeof searchFiltersSchema>;

export function parseSearchParams(sp: Record<string, string | string[] | undefined>): SearchFilters {
  const parsed = searchFiltersSchema.safeParse(sp);
  if (parsed.success) return parsed.data;
  // On invalid input fall back to defaults rather than erroring the page.
  return searchFiltersSchema.parse({});
}

/** Converts filters to the JSON payload of the search_listings RPC. */
export function filtersToRpcPayload(f: SearchFilters, pageSize = 24): Record<string, unknown> {
  const p: Record<string, unknown> = { sort: f.sort, page: f.page, page_size: pageSize };
  if (f.q) p.q = f.q;
  if (f.make?.length) p.make_ids = f.make;
  if (f.model?.length) p.model_ids = f.model;
  if (f.trim?.length) p.trim_ids = f.trim;
  for (const k of ["year_min", "year_max", "price_min", "price_max", "km_min", "km_max", "owners_max", "engine_min", "engine_max", "recent_days"] as const) {
    if (f[k] != null) p[k] = f[k];
  }
  if (f.fuel?.length) p.fuel = f.fuel;
  if (f.transmission?.length) p.transmission = f.transmission;
  if (f.body?.length) p.body = f.body;
  if (f.ownership?.length) p.ownership = f.ownership;
  if (f.condition?.length) p.condition = f.condition;
  if (f.category?.length) p.category = f.category;
  if (f.district?.length) p.district_ids = f.district;
  if (f.region?.length) p.region_ids = f.region;
  if (f.city?.length) p.city_ids = f.city;
  if (f.radius_city && f.radius_km) {
    p.radius_city_id = f.radius_city;
    p.radius_km = f.radius_km;
  }
  if (f.price_reduced) p.price_reduced = true;
  if (f.has_official_data) p.has_official_data = true;
  return p;
}

/** Serializes filters back to a query string (omits defaults). */
export function filtersToQuery(f: Partial<SearchFilters>): string {
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(f)) {
    if (v == null || v === "" || v === false) continue;
    if (k === "sort" && v === "newest") continue;
    if (k === "page" && v === 1) continue;
    if (k === "view" && v === "grid") continue;
    if (Array.isArray(v)) {
      if (v.length) sp.set(k, v.join(","));
    } else sp.set(k, String(v));
  }
  const s = sp.toString();
  return s ? `?${s}` : "";
}

export function countActiveFilters(f: SearchFilters): number {
  let n = 0;
  for (const [k, v] of Object.entries(f)) {
    if (["sort", "page", "view"].includes(k)) continue;
    if (v == null || v === "" || v === false) continue;
    if (Array.isArray(v) && v.length === 0) continue;
    n++;
  }
  return n;
}

/** Human-readable summary of a saved search, e.g. "טויוטה, 2020–2024, עד 90,000 ₪" */
export function describeFilters(f: Partial<SearchFilters>, names: { makes?: Record<string, string>; models?: Record<string, string>; districts?: Record<string, string>; cities?: Record<string, string> } = {}): string {
  const parts: string[] = [];
  if (f.make?.length) parts.push(f.make.map((id) => names.makes?.[id] ?? "יצרן").join(" או "));
  if (f.model?.length) parts.push(f.model.map((id) => names.models?.[id] ?? "דגם").join(" / "));
  if (f.year_min || f.year_max) parts.push(`${f.year_min ?? ""}${f.year_min && f.year_max ? "–" : ""}${f.year_max ?? ""}`.replace(/^–|–$/, (m) => (m === "–" ? "" : m)) && `שנים ${f.year_min ?? "…"}–${f.year_max ?? "…"}`);
  if (f.price_max) parts.push(`עד ${Number(f.price_max).toLocaleString("he-IL")} ₪`);
  else if (f.price_min) parts.push(`מ-${Number(f.price_min).toLocaleString("he-IL")} ₪`);
  if (f.km_max) parts.push(`עד ${Number(f.km_max).toLocaleString("he-IL")} ק״מ`);
  if (f.district?.length) parts.push(f.district.map((id) => names.districts?.[id] ?? "מחוז").join(", "));
  if (f.city?.length) parts.push(f.city.map((id) => names.cities?.[id] ?? "עיר").join(", "));
  if (f.q) parts.push(`"${f.q}"`);
  return parts.length ? parts.join(" · ") : "כל הרכבים";
}
