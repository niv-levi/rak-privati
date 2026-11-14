import Link from "next/link";
import { Suspense } from "react";
import { Heart } from "lucide-react";
import { requireUser } from "@/lib/auth/guards";
import { PageHeader } from "@/components/layout/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { buttonVariants } from "@/components/ui/button";
import { ListingGrid } from "@/features/listings/components/listing-grid";
import type { ListingCard } from "@/features/listings/queries/search";

export const metadata = { title: "רכבים שמורים", robots: { index: false } };

export default async function FavoritesPage() {
  const { user, supabase } = await requireUser("/account/favorites");
  const { data: favs } = await supabase.from("favorites").select("listing_id, created_at").eq("user_id", user.id).order("created_at", { ascending: false });
  const ids = (favs ?? []).map((f) => f.listing_id);
  // Reuse the search RPC projection for consistent cards (only active listings are returned)
  const { data: rows } = ids.length ? await supabase.rpc("search_listings", { p: { page_size: 48 } as never }) : { data: [] };
  const byId = new Map((rows ?? []).map((r) => [r.id, r]));
  const active: ListingCard[] = ids.map((id) => byId.get(id)).filter((x): x is ListingCard => !!x);
  const unavailable = ids.length - active.length;
  return (
    <div className="space-y-6">
      <PageHeader title="רכבים שמורים" description="כשמחיר של רכב ששמרתם יורד – תקבלו התראה." className="py-0" />
      {active.length === 0 ? (
        <EmptyState icon={<Heart />} title="עדיין לא שמרתם רכבים" description="לחצו על ״שמירה״ בכל מודעה כדי לעקוב אחריה ולקבל התראות על ירידת מחיר." action={<Link href="/cars" className={buttonVariants()}>לחיפוש רכב</Link>} />
      ) : (
        <Suspense><ListingGrid listings={active} /></Suspense>
      )}
      {unavailable > 0 && <p className="text-sm text-muted-foreground"><span className="num">{unavailable}</span> רכבים ששמרתם כבר אינם זמינים (נמכרו, פגו או הוסרו).</p>}
    </div>
  );
}
