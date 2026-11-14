import "server-only";
import { cache } from "react";
import { createSupabaseServerClient, getCurrentUser } from "@/lib/supabase/server";
import { resolveImageUrls } from "@/features/images/urls";
import type { Tables } from "@/lib/database.types";
import type { VehicleReport } from "@/lib/providers/types";
import type { GalleryImage } from "../components/detail/gallery";

export type ListingDetail = {
  listing: Tables<"listings">;
  images: GalleryImage[];
  city: { name_he: string; district_name: string | null } | null;
  seller: { display_name: string; phone_verified: boolean; declared_private: boolean; member_since: string; active_listings: number } | null;
  priceHistory: { old_price: number | null; new_price: number; changed_at: string }[];
  isOwner: boolean;
  isFavorite: boolean;
  viewerId: string | null;
  officialReport: VehicleReport | null;
};

export const getListingDetail = cache(async (id: string): Promise<ListingDetail | null> => {
  const [supabase, user] = await Promise.all([createSupabaseServerClient(), getCurrentUser()]);
  if (!supabase) return null;
  if (!/^[0-9a-f-]{36}$/.test(id)) return null;
  const { data: listing } = await supabase.from("listings").select("*").eq("id", id).maybeSingle();
  if (!listing) return null;
  const isOwner = !!user && user.id === listing.seller_id;
  const [imgs, city, seller, history, fav] = await Promise.all([
    supabase.from("listing_images").select("id, storage_path, alt_text, width, height, public_url, public_url_expires_at, sort_order, is_cover").eq("listing_id", id).eq("status", "ready").order("is_cover", { ascending: false }).order("sort_order"),
    listing.city_id ? supabase.from("geo_cities").select("name_he, geo_districts(name_he)").eq("id", listing.city_id).maybeSingle() : Promise.resolve({ data: null }),
    supabase.rpc("public_seller_info", { p_seller: listing.seller_id }),
    supabase.from("listing_price_history").select("old_price, new_price, changed_at").eq("listing_id", id).order("changed_at", { ascending: false }).limit(5),
    user ? supabase.from("favorites").select("listing_id").eq("user_id", user.id).eq("listing_id", id).maybeSingle() : Promise.resolve({ data: null }),
  ]);
  const rows = imgs.data ?? [];
  const urls = await resolveImageUrls(rows, { persist: listing.status === "active" });
  const images: GalleryImage[] = rows.map((r) => ({ id: r.id, url: urls.get(r.storage_path) ?? "", alt: r.alt_text, width: r.width, height: r.height })).filter((i) => i.url);
  const cityRow = city.data as { name_he: string; geo_districts: { name_he: string } | null } | null;
  return {
    listing,
    images,
    city: cityRow ? { name_he: cityRow.name_he, district_name: cityRow.geo_districts?.name_he ?? null } : null,
    seller: seller.data?.[0] ?? null,
    priceHistory: history.data ?? [],
    isOwner,
    isFavorite: !!fav.data,
    viewerId: user?.id ?? null,
    officialReport: (listing.official_data as unknown as VehicleReport | null) ?? null,
  };
});
