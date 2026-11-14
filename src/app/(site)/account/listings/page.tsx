import Link from "next/link";
import { CirclePlus, Car } from "lucide-react";
import { requireUser } from "@/lib/auth/guards";
import { PageHeader } from "@/components/layout/page-header";
import { buttonVariants } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { MyListingCard } from "@/features/account/components/my-listing-card";
import { resolveImageUrls } from "@/features/images/urls";

export const metadata = { title: "המודעות שלי", robots: { index: false } };

export default async function MyListingsPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sp = await searchParams;
  const { user, supabase } = await requireUser("/account/listings");
  const [{ data: listings }, limitRes, countRes, { data: appeals }] = await Promise.all([
    supabase.from("listings").select("id, make_name, model_name, trim_name, year, price, status, created_at, published_at, expires_at, views_count, contact_count, rejection_reason, correction_notes, wizard_step").eq("seller_id", user.id).neq("status", "removed").order("created_at", { ascending: false }),
    supabase.rpc("listing_limit_for", { p_user: user.id }),
    supabase.rpc("count_counted_listings", { p_user: user.id, p_exclude: null as unknown as string }),
    supabase.from("appeals").select("id, listing_id, status, created_at, decision_notes").eq("user_id", user.id).order("created_at", { ascending: false }),
  ]);
  const ids = (listings ?? []).map((l) => l.id);
  const { data: covers } = ids.length ? await supabase.from("listing_images").select("listing_id, storage_path, public_url, public_url_expires_at, is_cover, sort_order").in("listing_id", ids).eq("status", "ready").order("is_cover", { ascending: false }).order("sort_order") : { data: [] };
  const coverByListing = new Map<string, { storage_path: string; public_url: string | null; public_url_expires_at: string | null }>();
  for (const c of covers ?? []) if (!coverByListing.has(c.listing_id)) coverByListing.set(c.listing_id, c);
  const urls = await resolveImageUrls([...coverByListing.values()], { persist: false });
  const appealByListing = new Map((appeals ?? []).filter((a) => a.listing_id).map((a) => [a.listing_id!, a]));

  return (
    <div className="space-y-6">
      <PageHeader title="המודעות שלי" description={<>מותרות עד <span className="num">{limitRes.data ?? 2}</span> מודעות פעילות או ממתינות בו-זמנית. כרגע: <span className="num">{countRes.data ?? 0}</span>.</>} className="py-0" actions={<Link href="/account/listings/new" className={buttonVariants({ variant: "accent" })}><CirclePlus aria-hidden /> פרסום רכב</Link>} />
      {sp.submitted && <Alert variant="success"><AlertDescription>המודעה נשלחה לבדיקה. בדרך כלל האישור לוקח עד יום עסקים. נעדכן אותך בהתראה.</AlertDescription></Alert>}
      {(listings ?? []).length === 0 ? (
        <EmptyState icon={<Car />} title="אין לך מודעות עדיין" description="פרסום רכב מתחיל ממספר הרישוי ולוקח כמה דקות. ההתקדמות נשמרת אוטומטית." action={<Link href="/account/listings/new" className={buttonVariants({ variant: "accent" })}>פרסום רכב</Link>} />
      ) : (
        <ul className="space-y-4">
          {(listings ?? []).map((l) => {
            const cover = coverByListing.get(l.id);
            return <li key={l.id}><MyListingCard listing={l} coverUrl={cover ? urls.get(cover.storage_path) ?? null : null} appeal={appealByListing.get(l.id) ?? null} /></li>;
          })}
        </ul>
      )}
    </div>
  );
}
