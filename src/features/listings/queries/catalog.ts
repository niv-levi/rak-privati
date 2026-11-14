import "server-only";
import { cache } from "react";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export type MakeOption = { id: string; slug: string; name_he: string; name_en: string; is_popular: boolean };
export type ModelOption = { id: string; make_id: string; slug: string; name_he: string; name_en: string; category: string | null; body_style: string | null; is_popular: boolean };
export type DistrictOption = { id: string; code: string; name_he: string };
export type RegionOption = { id: string; district_id: string; code: string; name_he: string };
export type CityOption = { id: string; district_id: string; region_id: string | null; name_he: string; is_major: boolean; has_coords: boolean };

export const getMakes = cache(async (): Promise<MakeOption[]> => {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return [];
  const { data } = await supabase.from("vehicle_makes").select("id, slug, name_he, name_en, is_popular").eq("active", true).order("sort_order").order("name_he");
  return data ?? [];
});

export const getModels = cache(async (makeIds?: string[]): Promise<ModelOption[]> => {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return [];
  let q = supabase.from("vehicle_models").select("id, make_id, slug, name_he, name_en, category, body_style, is_popular").eq("active", true).order("name_he");
  if (makeIds?.length) q = q.in("make_id", makeIds);
  const { data } = await q.limit(2000);
  return data ?? [];
});

export const getGeo = cache(async (): Promise<{ districts: DistrictOption[]; regions: RegionOption[]; cities: CityOption[] }> => {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return { districts: [], regions: [], cities: [] };
  const [d, r, c] = await Promise.all([
    supabase.from("geo_districts").select("id, code, name_he").order("sort_order"),
    supabase.from("geo_regions").select("id, district_id, code, name_he").order("sort_order"),
    supabase.from("geo_cities").select("id, district_id, region_id, name_he, is_major, lat").eq("active", true).order("is_major", { ascending: false }).order("name_he").limit(2000),
  ]);
  return {
    districts: d.data ?? [],
    regions: r.data ?? [],
    cities: (c.data ?? []).map((x) => ({ id: x.id, district_id: x.district_id, region_id: x.region_id, name_he: x.name_he, is_major: x.is_major, has_coords: x.lat != null })),
  };
});

export const getPopularMakes = cache(async (): Promise<MakeOption[]> => (await getMakes()).filter((m) => m.is_popular).slice(0, 12));
