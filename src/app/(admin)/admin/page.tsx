import { isoDaysAgo } from "@/lib/time";
import Link from "next/link";
import { requireRole } from "@/lib/auth/guards";
import { StatCard } from "@/features/admin/components/stat-card";
import { PageHeader } from "@/components/layout/page-header";
import { getProviderHealth } from "@/lib/providers/registry";
import { Badge } from "@/components/ui/badge";
import { formatDateTime } from "@/lib/format";
import { flagTypeLabels, listingStatusLabels } from "@/lib/labels";
import { RunExpiryButton } from "@/features/admin/components/run-expiry-button";

export default async function AdminDashboard() {
  const { supabase, roles } = await requireRole("any", "/admin");
  const count = (table: "listings" | "profiles" | "listing_reports" | "moderation_flags" | "appeals", filter?: (q: ReturnType<typeof supabase.from>) => unknown) => {
    let q = supabase.from(table).select("*", { count: "exact", head: true }) as unknown as PromiseLike<{ count: number | null }> & Record<string, unknown>;
    if (filter) q = filter(q as never) as typeof q;
    return q;
  };
  const [users, active, pending, rejected, sold, reports, flags, appeals, strict, recentActions, recentFlags, analytics] = await Promise.all([
    supabase.from("profiles").select("id", { count: "exact", head: true }).not("phone_verified_at", "is", null),
    supabase.from("listings").select("id", { count: "exact", head: true }).eq("status", "active"),
    supabase.from("listings").select("id", { count: "exact", head: true }).eq("status", "pending_review"),
    supabase.from("listings").select("id", { count: "exact", head: true }).eq("status", "rejected"),
    supabase.from("listings").select("id", { count: "exact", head: true }).eq("status", "sold"),
    supabase.from("listing_reports").select("id", { count: "exact", head: true }).eq("status", "open"),
    supabase.from("moderation_flags").select("id", { count: "exact", head: true }).eq("status", "open"),
    supabase.from("appeals").select("id", { count: "exact", head: true }).eq("status", "open"),
    supabase.from("profiles").select("id", { count: "exact", head: true }).or("review_level.eq.strict,account_status.in.(suspended,blocked)"),
    supabase.from("moderation_actions").select("id, action, reason, created_at, listing_id, target_user_id").order("created_at", { ascending: false }).limit(8),
    supabase.from("moderation_flags").select("id, flag_type, severity, created_at, listing_id").eq("status", "open").order("severity", { ascending: false }).order("created_at", { ascending: false }).limit(6),
    supabase.from("analytics_events").select("event_name").gte("created_at", isoDaysAgo(7)).limit(5000),
  ]);
  void count;
  const health = await getProviderHealth();
  const weekly = new Map<string, number>();
  for (const e of analytics.data ?? []) weekly.set(e.event_name, (weekly.get(e.event_name) ?? 0) + 1);
  const conv = (a: string, b: string) => { const x = weekly.get(a) ?? 0, y = weekly.get(b) ?? 0; return x ? `${Math.round((y / x) * 100)}%` : "—"; };

  return (
    <div className="space-y-8">
      <PageHeader title="לוח בקרה" description="מצב המערכת, תור הבדיקה ובריאות מקורות המידע." className="py-0" actions={roles.includes("super_admin") ? <RunExpiryButton /> : undefined} />
      <section aria-label="מדדים" className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
        <StatCard label="משתמשים עם טלפון מאומת" value={users.count ?? 0} href="/admin/users" />
        <StatCard label="מודעות פעילות" value={active.count ?? 0} href="/admin/listings?status=active" tone="success" />
        <StatCard label="ממתינות לאישור" value={pending.count ?? 0} href="/admin/listings?status=pending_review" tone={(pending.count ?? 0) > 0 ? "warning" : "default"} />
        <StatCard label="נדחו" value={rejected.count ?? 0} href="/admin/listings?status=rejected" />
        <StatCard label="נמכרו" value={sold.count ?? 0} href="/admin/listings?status=sold" />
        <StatCard label="דיווחים פתוחים" value={reports.count ?? 0} href="/admin/reports" tone={(reports.count ?? 0) > 0 ? "warning" : "default"} />
        <StatCard label="דגלים פתוחים" value={flags.count ?? 0} href="/admin/listings?flagged=1" tone={(flags.count ?? 0) > 0 ? "danger" : "default"} />
        <StatCard label="ערעורים פתוחים" value={appeals.count ?? 0} href="/admin/reports#appeals" />
        <StatCard label="חשבונות חשודים/מוגבלים" value={strict.count ?? 0} href="/admin/users?filter=suspicious" />
        <StatCard label="המרה: חיפוש→מודעה (7 ימים)" value={conv("search_performed", "vehicle_detail_viewed")} hint={`מודעה→פנייה: ${conv("vehicle_detail_viewed", "contact_clicked")}`} />
      </section>
      <div className="grid gap-6 lg:grid-cols-2">
        <section aria-labelledby="flags-h" className="space-y-3">
          <h2 id="flags-h" className="text-h3 font-bold">דגלים דחופים</h2>
          {(recentFlags.data ?? []).length === 0 ? <p className="text-sm text-muted-foreground">אין דגלים פתוחים.</p> : (
            <ul className="divide-y divide-border rounded-lg border border-border bg-card">
              {(recentFlags.data ?? []).map((f) => <li key={f.id} className="flex items-center justify-between gap-3 p-3 text-sm"><span><Badge variant={f.severity >= 3 ? "destructive" : "warning"} className="me-2">חומרה {f.severity}</Badge>{flagTypeLabels[f.flag_type]}</span>{f.listing_id && <Link href={`/admin/listings/${f.listing_id}`} className="font-semibold text-primary underline-offset-4 hover:underline">למודעה</Link>}</li>)}
            </ul>
          )}
        </section>
        <section aria-labelledby="activity-h" className="space-y-3">
          <h2 id="activity-h" className="text-h3 font-bold">פעילות אחרונה</h2>
          <ul className="divide-y divide-border rounded-lg border border-border bg-card">
            {(recentActions.data ?? []).map((a) => <li key={a.id} className="flex items-center justify-between gap-3 p-3 text-sm"><span>{a.action}{a.reason ? ` · ${a.reason}` : ""}</span><span className="flex items-center gap-2 text-xs text-muted-foreground"><span className="num">{formatDateTime(a.created_at)}</span>{a.listing_id && <Link href={`/admin/listings/${a.listing_id}`} className="text-primary underline-offset-4 hover:underline">מודעה</Link>}{a.target_user_id && <Link href={`/admin/users/${a.target_user_id}`} className="text-primary underline-offset-4 hover:underline">משתמש</Link>}</span></li>)}
            {(recentActions.data ?? []).length === 0 && <li className="p-3 text-sm text-muted-foreground">אין פעולות עדיין.</li>}
          </ul>
        </section>
      </div>
      <section aria-labelledby="health-h" className="space-y-3">
        <div className="flex items-center justify-between"><h2 id="health-h" className="text-h3 font-bold">בריאות מקורות חיצוניים</h2><Link href="/admin/vehicle-data" className="text-sm font-semibold text-primary underline-offset-4 hover:underline">ניהול מקורות</Link></div>
        <ul className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
          {health.map((h) => <li key={h.key} className="rounded-md border border-border bg-card p-3 text-sm"><p className="font-semibold">{h.nameHe.split(" – ")[0]}</p><p className="mt-1"><Badge variant={h.configured ? "success" : h.usingFixtures ? "warning" : "muted"}>{h.usingFixtures ? "נתוני פיתוח" : h.configured ? "מחובר" : "לא הוגדר"}</Badge></p>{h.lastError && <p className="mt-1 truncate text-xs text-destructive" dir="ltr" title={h.lastError}>{h.lastError}</p>}</li>)}
        </ul>
      </section>
      <p className="text-xs text-muted-foreground">סטטוסים: {Object.values(listingStatusLabels).join(" · ")}</p>
    </div>
  );
}
