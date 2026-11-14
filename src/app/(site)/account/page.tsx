import Link from "next/link";
import { CirclePlus, Heart, Bell, Bookmark, FileSearch, Car } from "lucide-react";
import { requireUser, getProfile } from "@/lib/auth/guards";
import { Card, CardContent } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import { PageHeader } from "@/components/layout/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { listingStatusLabels } from "@/lib/labels";
import { formatPrice, formatRelativeDays } from "@/lib/format";
import { Badge } from "@/components/ui/badge";

export const metadata = { title: "החשבון שלי", robots: { index: false } };

export default async function AccountPage() {
  const { user, supabase } = await requireUser("/account");
  const profile = await getProfile();
  const [listings, favs, searches, reports, notifs, recent] = await Promise.all([
    supabase.from("listings").select("id, make_name, model_name, year, price, status, created_at, views_count, contact_count").eq("seller_id", user.id).neq("status", "removed").order("created_at", { ascending: false }).limit(3),
    supabase.from("favorites").select("listing_id", { count: "exact", head: true }).eq("user_id", user.id),
    supabase.from("saved_searches").select("id", { count: "exact", head: true }).eq("user_id", user.id),
    supabase.from("saved_vehicle_reports").select("id", { count: "exact", head: true }).eq("user_id", user.id),
    supabase.from("notifications").select("id, title, body, href, created_at, read_at").eq("user_id", user.id).order("created_at", { ascending: false }).limit(4),
    supabase.from("recently_viewed").select("listing_id, viewed_at, listings!inner(id, make_name, model_name, year, price, status)").eq("user_id", user.id).order("viewed_at", { ascending: false }).limit(4),
  ]);
  const stats = [
    { label: "רכבים שמורים", value: favs.count ?? 0, href: "/account/favorites", icon: Heart },
    { label: "חיפושים שמורים", value: searches.count ?? 0, href: "/account/searches", icon: Bookmark },
    { label: "דוחות רכב", value: reports.count ?? 0, href: "/account/vehicle-checks", icon: FileSearch },
    { label: "התראות חדשות", value: (notifs.data ?? []).filter((n) => !n.read_at).length, href: "/account/notifications", icon: Bell },
  ];
  return (
    <div className="space-y-8">
      <PageHeader title={`שלום${profile?.display_name ? `, ${profile.display_name}` : ""}`} description="כאן מרוכזים הרכבים שאתם מוכרים, הרכבים ששמרתם והעדכונים שלכם." className="py-0" actions={<Link href="/account/listings/new" className={buttonVariants({ variant: "accent" })}><CirclePlus aria-hidden /> פרסום רכב</Link>} />
      <ul className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {stats.map((s) => (
          <li key={s.label}>
            <Link href={s.href} className="block rounded-lg border border-border bg-card p-4 shadow-card transition-shadow hover:shadow-card-hover focus-visible:outline-2 focus-visible:outline-ring">
              <s.icon className="size-5 text-primary" aria-hidden />
              <p className="mt-2 text-2xl font-extrabold num">{s.value}</p>
              <p className="text-sm text-muted-foreground">{s.label}</p>
            </Link>
          </li>
        ))}
      </ul>
      <section aria-labelledby="my-listings" className="space-y-3">
        <div className="flex items-center justify-between"><h2 id="my-listings" className="text-h3 font-bold">המודעות שלי</h2><Link href="/account/listings" className="text-sm font-semibold text-primary underline-offset-4 hover:underline">לכל המודעות</Link></div>
        {(listings.data ?? []).length === 0 ? (
          <EmptyState icon={<Car />} title="עדיין לא פרסמת רכב" description="הפרסום מתחיל ממספר הרישוי ולוקח כמה דקות." action={<Link href="/account/listings/new" className={buttonVariants({ variant: "accent" })}>פרסום רכב</Link>} />
        ) : (
          <ul className="grid gap-3 sm:grid-cols-3">
            {(listings.data ?? []).map((l) => (
              <li key={l.id}>
                <Card><CardContent className="space-y-2 pt-5">
                  <div className="flex items-start justify-between gap-2"><p className="font-bold">{l.make_name} {l.model_name} <span className="num">{l.year}</span></p><Badge variant={l.status === "active" ? "success" : l.status === "pending_review" ? "warning" : "muted"}>{listingStatusLabels[l.status]}</Badge></div>
                  <p className="text-lg font-extrabold num">{formatPrice(l.price)}</p>
                  <p className="text-xs text-muted-foreground num">{l.views_count} צפיות · {l.contact_count} פניות</p>
                  <Link href={l.status === "draft" || l.status === "needs_correction" ? `/account/listings/${l.id}/edit` : `/cars/${l.id}`} className="text-sm font-semibold text-primary underline-offset-4 hover:underline">{l.status === "draft" ? "המשך עריכה" : "צפייה"}</Link>
                </CardContent></Card>
              </li>
            ))}
          </ul>
        )}
      </section>
      <div className="grid gap-6 lg:grid-cols-2">
        <section aria-labelledby="recent-notifs" className="space-y-3">
          <h2 id="recent-notifs" className="text-h3 font-bold">התראות אחרונות</h2>
          {(notifs.data ?? []).length === 0 ? <p className="text-sm text-muted-foreground">אין התראות עדיין.</p> : (
            <ul className="divide-y divide-border rounded-lg border border-border bg-card">
              {(notifs.data ?? []).map((n) => (
                <li key={n.id} className="p-3 text-sm">
                  <Link href={n.href ?? "/account/notifications"} className="block hover:underline underline-offset-4"><span className={n.read_at ? "" : "font-bold"}>{n.title}</span></Link>
                  <p className="text-xs text-muted-foreground">{n.body} · {formatRelativeDays(n.created_at).replace("פורסם", "")}</p>
                </li>
              ))}
            </ul>
          )}
        </section>
        <section aria-labelledby="recent-viewed" className="space-y-3">
          <h2 id="recent-viewed" className="text-h3 font-bold">נצפו לאחרונה</h2>
          {(recent.data ?? []).length === 0 ? <p className="text-sm text-muted-foreground">רכבים שתצפו בהם יופיעו כאן.</p> : (
            <ul className="divide-y divide-border rounded-lg border border-border bg-card">
              {(recent.data ?? []).map((r) => {
                const l = r.listings as unknown as { id: string; make_name: string | null; model_name: string | null; year: number | null; price: number | null; status: string };
                return (
                  <li key={r.listing_id} className="flex items-center justify-between p-3 text-sm">
                    <Link href={`/cars/${l.id}`} className="font-semibold hover:underline underline-offset-4">{l.make_name} {l.model_name} <span className="num">{l.year}</span></Link>
                    <span className="num">{l.status === "active" ? formatPrice(l.price) : "לא זמין"}</span>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
