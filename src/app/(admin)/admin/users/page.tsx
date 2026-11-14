import Link from "next/link";
import { requireRole } from "@/lib/auth/guards";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { accountStatusLabels } from "@/lib/labels";
import { formatDateTime, maskPhone } from "@/lib/format";

export default async function AdminUsersPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sp = await searchParams;
  const { supabase } = await requireRole("any", "/admin/users");
  const q = typeof sp.q === "string" ? sp.q.trim() : "";
  const filter = typeof sp.filter === "string" ? sp.filter : "";
  let query = supabase.from("profiles").select("id, display_name, phone_e164, phone_verified_at, account_status, review_level, max_active_listings, created_at, last_seen_at").order("created_at", { ascending: false }).limit(100);
  if (q) query = /^\+?\d{6,}$/.test(q.replace(/[-\s]/g, "")) ? query.ilike("phone_e164", `%${q.replace(/[-\s]/g, "").replace(/^0/, "")}%`) : query.ilike("display_name", `%${q}%`);
  if (filter === "suspicious") query = query.or("review_level.eq.strict,account_status.in.(warned,suspended,blocked)");
  const { data: users } = await query;
  const ids = (users ?? []).map((u) => u.id);
  const [{ data: counts }, { data: openFlags }] = await Promise.all([
    ids.length ? supabase.from("listings").select("seller_id, status").in("seller_id", ids) : Promise.resolve({ data: [] }),
    ids.length ? supabase.from("moderation_flags").select("user_id").in("user_id", ids).eq("status", "open") : Promise.resolve({ data: [] }),
  ]);
  const listingsBy = new Map<string, number>(); for (const c of counts ?? []) if (c.status !== "removed") listingsBy.set(c.seller_id, (listingsBy.get(c.seller_id) ?? 0) + 1);
  const flagsBy = new Map<string, number>(); for (const f of openFlags ?? []) if (f.user_id) flagsBy.set(f.user_id, (flagsBy.get(f.user_id) ?? 0) + 1);
  return (
    <div className="space-y-6">
      <PageHeader title="משתמשים" className="py-0" />
      <form className="flex flex-wrap gap-2" role="search"><Input name="q" defaultValue={q} placeholder="חיפוש לפי שם או טלפון" className="max-w-xs" aria-label="חיפוש משתמשים" /><Button type="submit" variant="outline">חיפוש</Button><Link href="/admin/users?filter=suspicious" className="inline-flex h-11 items-center rounded-md border border-border bg-card px-4 text-sm font-semibold hover:bg-secondary">חשודים / מוגבלים</Link></form>
      <div className="overflow-x-auto rounded-lg border border-border bg-card">
        <table className="w-full min-w-[720px] text-sm">
          <caption className="sr-only">רשימת משתמשים</caption>
          <thead className="bg-secondary/60 text-xs text-muted-foreground"><tr><th scope="col" className="p-3 text-start">משתמש</th><th scope="col" className="p-3 text-start">טלפון</th><th scope="col" className="p-3 text-start">מצב</th><th scope="col" className="p-3 text-start">מודעות</th><th scope="col" className="p-3 text-start">דגלים</th><th scope="col" className="p-3 text-start">נוצר</th></tr></thead>
          <tbody>
            {(users ?? []).map((u) => (
              <tr key={u.id} className="border-t border-border">
                <td className="p-3"><Link href={`/admin/users/${u.id}`} className="font-semibold hover:underline underline-offset-4">{u.display_name ?? "ללא שם"}</Link></td>
                <td className="p-3 num">{maskPhone(u.phone_e164)} {u.phone_verified_at && <Badge variant="success">מאומת</Badge>}</td>
                <td className="p-3"><Badge variant={u.account_status === "active" ? "success" : u.account_status === "warned" ? "warning" : "destructive"}>{accountStatusLabels[u.account_status]}</Badge>{u.review_level === "strict" && <Badge variant="warning" className="ms-1">מחמיר</Badge>}</td>
                <td className="p-3 num">{listingsBy.get(u.id) ?? 0}{u.max_active_listings != null && <span className="text-xs text-muted-foreground"> (מגבלה {u.max_active_listings})</span>}</td>
                <td className="p-3 num">{flagsBy.get(u.id) ? <Badge variant="destructive">{flagsBy.get(u.id)}</Badge> : "—"}</td>
                <td className="p-3 num text-xs text-muted-foreground">{formatDateTime(u.created_at)}</td>
              </tr>
            ))}
            {(users ?? []).length === 0 && <tr><td colSpan={6} className="p-6 text-center text-muted-foreground">לא נמצאו משתמשים.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
