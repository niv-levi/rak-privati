import Link from "next/link";
import { X } from "lucide-react";
import { filtersToQuery, type SearchFilters } from "../search-params";
import type { MakeOption, ModelOption, DistrictOption, CityOption } from "../queries/catalog";
import { bodyStyleLabels, categoryLabels, conditionLabels, fuelLabels, ownershipLabels, transmissionLabels } from "@/lib/labels";

type Names = { makes: MakeOption[]; models: ModelOption[]; districts: DistrictOption[]; cities: CityOption[] };

export function ActiveFilterChips({ filters, names, basePath = "/cars" }: { filters: SearchFilters; names: Names; basePath?: string }) {
  const chips: { label: string; remove: Partial<SearchFilters> }[] = [];
  const f = filters;
  const removeFrom = (key: keyof SearchFilters, value: string) => ({ [key]: ((f[key] as string[]) ?? []).filter((x) => x !== value) }) as Partial<SearchFilters>;
  f.make?.forEach((id) => chips.push({ label: names.makes.find((m) => m.id === id)?.name_he ?? "יצרן", remove: { ...removeFrom("make", id), model: (f.model ?? []).filter((mid) => names.models.find((m) => m.id === mid)?.make_id !== id) } }));
  f.model?.forEach((id) => chips.push({ label: names.models.find((m) => m.id === id)?.name_he ?? "דגם", remove: removeFrom("model", id) }));
  if (f.q) chips.push({ label: `"${f.q}"`, remove: { q: undefined } });
  if (f.price_min || f.price_max) chips.push({ label: `מחיר ${f.price_min?.toLocaleString("he-IL") ?? ""}${f.price_min && f.price_max ? "–" : f.price_min ? "+" : "עד "}${f.price_max?.toLocaleString("he-IL") ?? ""} ₪`, remove: { price_min: undefined, price_max: undefined } });
  if (f.year_min || f.year_max) chips.push({ label: `שנים ${f.year_min ?? ""}${f.year_min && f.year_max ? "–" : f.year_min ? "+" : "עד "}${f.year_max ?? ""}`, remove: { year_min: undefined, year_max: undefined } });
  if (f.km_min || f.km_max) chips.push({ label: `ק״מ ${f.km_min?.toLocaleString("he-IL") ?? ""}${f.km_min && f.km_max ? "–" : f.km_min ? "+" : "עד "}${f.km_max?.toLocaleString("he-IL") ?? ""}`, remove: { km_min: undefined, km_max: undefined } });
  if (f.owners_max) chips.push({ label: `עד יד ${f.owners_max}`, remove: { owners_max: undefined } });
  if (f.engine_min || f.engine_max) chips.push({ label: `נפח ${f.engine_min ?? ""}–${f.engine_max ?? ""}`, remove: { engine_min: undefined, engine_max: undefined } });
  f.fuel?.forEach((v) => chips.push({ label: fuelLabels[v as keyof typeof fuelLabels] ?? v, remove: removeFrom("fuel", v) }));
  f.transmission?.forEach((v) => chips.push({ label: transmissionLabels[v as keyof typeof transmissionLabels] ?? v, remove: removeFrom("transmission", v) }));
  f.body?.forEach((v) => chips.push({ label: bodyStyleLabels[v as keyof typeof bodyStyleLabels] ?? v, remove: removeFrom("body", v) }));
  f.category?.forEach((v) => chips.push({ label: categoryLabels[v] ?? v, remove: removeFrom("category", v) }));
  f.ownership?.forEach((v) => chips.push({ label: ownershipLabels[v as keyof typeof ownershipLabels] ?? v, remove: removeFrom("ownership", v) }));
  f.condition?.forEach((v) => chips.push({ label: conditionLabels[v as keyof typeof conditionLabels] ?? v, remove: removeFrom("condition", v) }));
  f.district?.forEach((id) => chips.push({ label: names.districts.find((d) => d.id === id)?.name_he ?? "מחוז", remove: removeFrom("district", id) }));
  f.city?.forEach((id) => chips.push({ label: names.cities.find((c) => c.id === id)?.name_he ?? "עיר", remove: { ...removeFrom("city", id), radius_city: undefined, radius_km: undefined } }));
  if (f.radius_city && f.radius_km) chips.push({ label: `עד ${f.radius_km} ק״מ מ${names.cities.find((c) => c.id === f.radius_city)?.name_he ?? "העיר"}`, remove: { radius_city: undefined, radius_km: undefined, city: [f.radius_city] } });
  if (f.recent_days) chips.push({ label: "פורסמו לאחרונה", remove: { recent_days: undefined } });
  if (f.price_reduced) chips.push({ label: "ירידת מחיר", remove: { price_reduced: undefined } });
  if (f.has_official_data) chips.push({ label: "עם נתונים רשמיים", remove: { has_official_data: undefined } });
  if (!chips.length) return null;
  return (
    <ul className="flex flex-wrap gap-2" aria-label="מסננים פעילים">
      {chips.map((c, i) => (
        <li key={i}>
          <Link href={`${basePath}${filtersToQuery({ ...f, ...c.remove, page: 1 })}`} className="inline-flex items-center gap-1 rounded-full border border-border bg-card px-3 py-1 text-xs font-semibold hover:bg-secondary focus-visible:outline-2 focus-visible:outline-ring" aria-label={`הסרת המסנן ${c.label}`}>
            {c.label} <X className="size-3" aria-hidden />
          </Link>
        </li>
      ))}
      <li>
        <Link href={basePath} className="inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold text-primary underline-offset-4 hover:underline">ניקוי הכול</Link>
      </li>
    </ul>
  );
}
