"use server";
import { z } from "zod";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { Enums } from "@/lib/database.types";

export type CompareRow = {
  id: string; make_name: string | null; model_name: string | null; trim_name: string | null; year: number | null; price: number | null; mileage_km: number | null; test_mileage_km: number | null;
  fuel_type: Enums<"fuel_type"> | null; transmission: Enums<"transmission_type"> | null; engine_cc: number | null; ownership_count_declared: number | null; ownership_type: Enums<"ownership_type"> | null;
  body_style: Enums<"body_style"> | null; condition: Enums<"vehicle_condition"> | null; city_name: string | null; has_official_data: boolean; accident_declared: boolean | null;
};

/** Public data only (active listings via RLS). */
export async function fetchCompareAction(ids: string[]): Promise<CompareRow[]> {
  const parsed = z.array(z.string().uuid()).max(3).safeParse(ids);
  const supabase = await createSupabaseServerClient();
  if (!parsed.success || !supabase) return [];
  const { data } = await supabase.from("listings").select("id, make_name, model_name, trim_name, year, price, mileage_km, test_mileage_km, fuel_type, transmission, engine_cc, ownership_count_declared, ownership_type, body_style, condition, accident_declared, official_data, city_id, geo_cities(name_he)").in("id", parsed.data).eq("status", "active");
  const byId = new Map((data ?? []).map((r) => [r.id, r]));
  return parsed.data.map((id) => byId.get(id)).filter((r): r is NonNullable<typeof r> => !!r).map((r) => ({
    id: r.id!, make_name: r.make_name, model_name: r.model_name, trim_name: r.trim_name, year: r.year, price: r.price, mileage_km: r.mileage_km, test_mileage_km: r.test_mileage_km,
    fuel_type: r.fuel_type, transmission: r.transmission, engine_cc: r.engine_cc, ownership_count_declared: r.ownership_count_declared, ownership_type: r.ownership_type, body_style: r.body_style, condition: r.condition,
    city_name: (r.geo_cities as unknown as { name_he: string } | null)?.name_he ?? null, has_official_data: r.official_data != null, accident_declared: r.accident_declared,
  }));
}
