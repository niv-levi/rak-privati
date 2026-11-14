import Link from "next/link";
import { requireRole } from "@/lib/auth/guards";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { formatDateTime, formatPrice } from "@/lib/format";
import { listingStatusLabels, flagTypeLabels } from "@/lib/labels";
import type { Enums } from "@/lib/database.types";
import { cn } from "@/lib/utils";

const statuses: Enums<"listing_status">[] = ["pending_review", "needs_correction", "active", "paused", "rejected", "sold", "expired", "removed", "draft"];

export default async function AdminListingsPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sp = await searchParams;
  const { supabase } = await requireRole("any", "/admin/listings");
  const status = (typeof sp.status === "string" && statuses.includes(sp.status as never) ? sp.status : "pending_review") as Enums<"listing_status">;
  const flagged = sp.flagged === "1";
  let q = supabase.from("listings").select("id, make_name, model_name, year, price, status, submitted_at, created_at, seller_id, plate_masked, city_id").order("submitted_at", { ascending: true, nullsFirst: false }).limit(100);
  if (!flagged) q = q.eq("status", status);
  const { data: listings } = await q;
  const ids = (listings ?? []).map((l) => l.id);
  const [{ data: flags }, { data: sellers }] = await Promise.all([
    ids.length ? supabase.from("moderation_flags").select("listing_id, flag_type, severity, status").in("listing_id", ids).in("status", ["open", "reviewing"]) : Promise.resolve({ data: [] }),
    ids.length ? supabase.from("profiles").select("id, display_name, review_level, account_status").in("id", [...new Set((listings ?? []).map((l) => l.seller_id))]) : Promise.resolve({ data: [] }),
  ]);
  const flagsBy = new Map<string, { flag_type: Enums<"flag_type">; severity: number }[]>();
  for (const f of flags ?? []) flagsBy.set(f.listing_id!, [...(flagsBy.get(f.listing_id!) ?? []), f]);
  const sellerBy = new Map((sellers ?? []).map((s) => [s.id, s]));
  const rows = flagged ? (listings ?? []).filter((l) => flagsBy.has(l.id)) : listings ?? [];

  return (
    <div className="space-y-6">
      <PageHeader title="בקרת מודעות" description="מודעות ממתינות מסודרות לפי זמן שליחה. דגלים אוטומטיים הם סימון לבדיקה – לא הכרעה." className="py-0" />
      <nav aria-label="סינון לפי סטטוס" className="flex flex-wrap gap-1">
        <Link href="/admin/listings?flagged=1" className={cn("rounded-full border px-3 py-1 text-xs font-semibold", flagged ? "border-destructive bg-destructive text-white" : "border-border bg-card hover:bg-secondary")}>מסומנות בדגל</Link>
        {statuses.map((s) => <Link key={s} href={`/admin/listings?status=${s}`} className={cn("rounded-full border px-3 py-1 text-xs font-semibold", !flagged && status === s ? "border-primary bg-primary text-white" : "border-border bg-card hover:bg-secondary")}>{listingStatusLabels[s]}</Link>)}
      </nav>
      <div className="overflow-x-auto rounded-lg border border-border bg-card">
        <table className="w-full min-w-[720px] text-sm">
          <caption className="sr-only">רשימת מודעות לבקרה</caption>
          <thead className="bg-secondary/60 text-xs text-muted-foreground"><tr><th scope="col" className="p-3 text-start">רכב</th><th scope="col" className="p-3 text-start">מחיר</th><th scope="col" className="p-3 text-start">מוכר</th><th scope="col" className="p-3 text-start">דגלים</th><th scope="col" className="p-3 text-start">נשלחה</th><th scope="col" className="p-3 text-start">סטטוס</th><th scope="col" className="p-3"><span className="sr-only">פעולות</span></th></tr></thead>
          <tbody>
            {rows.length === 0 && <tr><td colSpan={7} className="p-6 text-center text-muted-foreground">אין מודעות בסינון הזה.</td></tr>}
            {rows.map((l) => {
              const seller = sellerBy.get(l.seller_id);
              const fl = flagsBy.get(l.id) ?? [];
              return (
                <tr key={l.id} className="border-t border-border">
                  <td className="p-3"><Link href={`/admin/listings/${l.id}`} className="font-semibold hover:underline underline-offset-4">{l.make_name ?? "—"} {l.model_name ?? ""} <span className="num">{l.year ?? ""}</span></Link><p className="text-xs text-muted-foreground num">{l.plate_masked ?? "ללא מספר"}</p></td>
                  <td className="p-3 num">{formatPrice(l.price)}</td>
                  <td className="p-3"><Link href={`/admin/users/${l.seller_id}`} className="hover:underline underline-offset-4">{seller?.display_name ?? "ללא שם"}</Link>{seller?.review_level === "strict" && <Badge variant="warning" className="ms-1">בדיקה מחמירה</Badge>}{seller && seller.account_status !== "active" && <Badge variant="destructive" className="ms-1">{seller.account_status}</Badge>}</td>
                  <td className="p-3"><ul className="flex flex-wrap gap-1">{fl.map((f, i) => <li key={i}><Badge variant={f.severity >= 3 ? "destructive" : "warning"} title={flagTypeLabels[f.flag_type]}>{flagTypeLabels[f.flag_type]}</Badge></li>)}</ul></td>
                  <td className="p-3 num text-xs text-muted-foreground">{formatDateTime(l.submitted_at ?? l.created_at)}</td>
                  <td className="p-3"><Badge variant="muted">{listingStatusLabels[l.status]}</Badge></td>
                  <td className="p-3 text-end"><Link href={`/admin/listings/${l.id}`} className="font-semibold text-primary underline-offset-4 hover:underline">בדיקה</Link></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
