import { resolveImageUrls } from "@/features/images/urls";
import type { ListingCard as ListingCardData } from "../queries/search";
import { ListingCard } from "./listing-card";

/** Server component: resolves cover image URLs in one batch, then renders cards. */
export async function ListingGrid({ listings, view = "grid", priorityCount = 3 }: { listings: ListingCardData[]; view?: "grid" | "list"; priorityCount?: number }) {
  const missing = listings.filter((l) => l.cover_path && !l.cover_url).map((l) => ({ storage_path: l.cover_path! }));
  const signed = missing.length ? await resolveImageUrls(missing, { persist: true }) : new Map<string, string>();
  return (
    <ul className={view === "list" ? "flex flex-col gap-4" : "grid gap-5 sm:grid-cols-2 xl:grid-cols-3"} aria-label="תוצאות חיפוש">
      {listings.map((l, i) => (
        <li key={l.id}>
          <ListingCard listing={{ ...l, cover_url: l.cover_url ?? (l.cover_path ? signed.get(l.cover_path) ?? null : null) }} view={view} priority={i < priorityCount} />
        </li>
      ))}
    </ul>
  );
}
