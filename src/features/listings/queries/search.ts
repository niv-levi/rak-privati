import "server-only";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/database.types";
import { filtersToRpcPayload, type SearchFilters } from "../search-params";

export type ListingCard = Database["public"]["Functions"]["search_listings"]["Returns"][number];
export const PAGE_SIZE = 24;

export type SearchResult = { items: ListingCard[]; total: number; page: number; pageSize: number; totalPages: number; available: boolean };

export async function searchListings(filters: SearchFilters, pageSize = PAGE_SIZE): Promise<SearchResult> {
  const supabase = await createSupabaseServerClient();
  const empty: SearchResult = { items: [], total: 0, page: filters.page, pageSize, totalPages: 0, available: !!supabase };
  if (!supabase) return empty;
  const { data, error } = await supabase.rpc("search_listings", { p: filtersToRpcPayload(filters, pageSize) as never });
  if (error) {
    console.error("[search] rpc failed", error.message);
    return { ...empty, available: false };
  }
  const items = data ?? [];
  const total = items.length ? Number(items[0].total_count) : 0;
  return { items, total, page: filters.page, pageSize, totalPages: Math.ceil(total / pageSize), available: true };
}

export async function getRecentListings(limit = 8): Promise<ListingCard[]> {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return [];
  const { data } = await supabase.rpc("search_listings", { p: { sort: "newest", page: 1, page_size: limit } as never });
  return data ?? [];
}
