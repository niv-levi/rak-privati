import Link from "next/link";
import { notFound } from "next/navigation";
import { requireRole, hasRole } from "@/lib/auth/guards";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { UserActionsPanel } from "@/features/admin/components/user-actions-panel";
import { RolesPanel } from "@/features/admin/components/roles-panel";
import { accountStatusLabels, flagTypeLabels, listingStatusLabels, roleLabels } from "@/lib/labels";
import { formatDateTime, formatIsraeliPhone } from "@/lib/format";

export default async function AdminUserDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase, roles, user: me } = await requireRole("any", `/admin/users/${id}`);
  const { data: u } = await supabase.from("profiles").select("*").eq("id", id).maybeSingle();
  if (!u) notFound();
  const [listings, flags, actions, appeals, decls, consents, userRoles, signals, contactsMade, reportsFiled] = await Promise.all([
    supabase.from("listings").select("id, make_name, model_name, year, price, status, created_at, plate_masked").eq("seller_id", id).order("created_at", { ascending: false }),
    supabase.from("moderation_flags").select("id, flag_type, severity, status, created_at, listing_id").eq("user_id", id).order("created_at", { ascending: false }).limit(30),
    supabase.from("moderation_actions").select("id, action, reason, notes, created_at, listing_id").eq("target_user_id", id).order("created_at", { ascending: false }).limit(30),
    supabase.from("appeals").select("id, status, message, created_at, decision_notes").eq("user_id", id).order("created_at", { ascending: false }),
    supabase.from("seller_declarations").select("declaration_version, declared_at, revoked_at").eq("user_id", id).order("declared_at", { ascending: false }),
    supabase.from("consent_records").select("consent_type, version, granted, granted_at").eq("user_id", id).order("granted_at", { ascending: false }).limit(20),
    supabase.from("user_roles").select("role").eq("user_id", id),
    supabase.from("account_signals").select("signal_type, value_hash, last_seen_at").eq("user_id", id),
    supabase.from("contact_events").select("id", { count: "exact", head: true }).eq("requester_id", id),
    supabase.from("listing_reports").select("id", { count: "exact", head: true }).eq("reporter_id", id),
  ]);
  // Related accounts sharing a signal hash
  const hashes = (signals.data ?? []).map((s) => s.value_hash);
  const { data: related } = hashes.length ? await supabase.from("account_signals").select("user_id, signal_type").in("value_hash", hashes).neq("user_id", id) : { data: [] };
  const relatedIds = [...new Set((related ?? []).map((r) => r.user_id))];
  const canModerate = hasRole(roles, "moderator");
  const isSuper = hasRole(roles, "super_admin");
  return (
    <div className="space-y-6">
      <PageHeader title={u.display_name ?? "משתמש ללא שם"} description={<>מצב: <Badge variant={u.account_status === "active" ? "success" : "destructive"}>{accountStatusLabels[u.account_status]}</Badge> · רמת בדיקה: {u.review_level} · נוצר <span className="num">{formatDateTime(u.created_at)}</span></>} className="py-0" />
      <div className="grid gap-6 xl:grid-cols-[1fr_380px]">
        <div className="space-y-6">
          <Card>
            <CardHeader><CardTitle>מודעות ({listings.data?.length ?? 0})</CardTitle></CardHeader>
            <CardContent>
              {(listings.data ?? []).length === 0 ? <p className="text-sm text-muted-foreground">אין מודעות.</p> : <ul className="divide-y divide-border text-sm">{listings.data!.map((l) => <li key={l.id} className="flex items-center justify-between py-2"><Link href={`/admin/listings/${l.id}`} className="font-semibold hover:underline underline-offset-4">{l.make_name} {l.model_name} <span className="num">{l.year}</span> <span className="num text-xs text-muted-foreground">{l.plate_masked}</span></Link><span className="flex items-center gap-2"><Badge variant="muted">{listingStatusLabels[l.status]}</Badge><span className="num text-xs text-muted-foreground">{formatDateTime(l.created_at)}</span></span></li>)}</ul>}
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle>סימנים חשודים</CardTitle></CardHeader>
            <CardContent className="space-y-3 text-sm">
              <p>דגלים: {(flags.data ?? []).length === 0 ? "אין" : <ul className="mt-1 flex flex-wrap gap-1">{flags.data!.map((f) => <li key={f.id}><Badge variant={f.status === "open" ? "destructive" : "muted"}>{flagTypeLabels[f.flag_type]}</Badge></li>)}</ul>}</p>
              <p>חשבונות קשורים (לפי אות מכשיר/IP משותף, ערכים מגובבים): {relatedIds.length === 0 ? "לא נמצאו" : <ul className="mt-1 list-disc ps-5">{relatedIds.map((r) => <li key={r}><Link href={`/admin/users/${r}`} className="underline-offset-4 hover:underline">{r.slice(0, 8)}…</Link></li>)}</ul>}</p>
              <p className="text-muted-foreground">חשיפות פרטי קשר שביצע: <span className="num">{contactsMade.count ?? 0}</span> · דיווחים שהגיש: <span className="num">{reportsFiled.count ?? 0}</span></p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle>היסטוריית פעולות וערעורים</CardTitle></CardHeader>
            <CardContent className="space-y-4 text-sm">
              {(actions.data ?? []).length === 0 ? <p className="text-muted-foreground">אין פעולות.</p> : <ul className="divide-y divide-border">{actions.data!.map((a) => <li key={a.id} className="py-2"><strong>{a.action}</strong>{a.reason && ` · ${a.reason}`}{a.listing_id && <> · <Link href={`/admin/listings/${a.listing_id}`} className="text-primary underline-offset-4 hover:underline">מודעה</Link></>}<p className="text-xs text-muted-foreground num">{formatDateTime(a.created_at)}</p></li>)}</ul>}
              {(appeals.data ?? []).length > 0 && <div><h3 className="font-bold">ערעורים</h3><ul className="divide-y divide-border">{appeals.data!.map((a) => <li key={a.id} className="py-2"><Badge variant={a.status === "open" ? "warning" : "muted"}>{a.status}</Badge> <span className="num text-xs text-muted-foreground">{formatDateTime(a.created_at)}</span><p>{a.message}</p>{a.decision_notes && <p className="text-muted-foreground">החלטה: {a.decision_notes}</p>}</li>)}</ul></div>}
            </CardContent>
          </Card>
        </div>
        <aside className="space-y-6">
          <Card>
            <CardHeader><CardTitle className="text-base">פרטי חשבון</CardTitle></CardHeader>
            <CardContent className="space-y-1 text-sm">
              <p>טלפון: <span className="num font-semibold">{formatIsraeliPhone(u.phone_e164)}</span> {u.phone_verified_at && <Badge variant="success">מאומת</Badge>}</p>
              <p>מגבלת מודעות: {u.max_active_listings ?? "ברירת מחדל"}</p>
              <p>סיבת סטטוס: {u.status_reason ?? "—"}</p>
              <p>נראה לאחרונה: <span className="num">{formatDateTime(u.last_seen_at)}</span></p>
              <p>תפקידים: {(userRoles.data ?? []).length ? userRoles.data!.map((r) => <Badge key={r.role} variant="secondary" className="me-1">{roleLabels[r.role]}</Badge>) : "משתמש רגיל"}</p>
              <p>הצהרות מוכר פרטי: {(decls.data ?? []).length === 0 ? "אין" : decls.data!.map((d, i) => <span key={i} className="block text-xs">{d.declaration_version} · <span className="num">{formatDateTime(d.declared_at)}</span>{d.revoked_at ? " · בוטלה" : ""}</span>)}</p>
              <p>הסכמות אחרונות: {(consents.data ?? []).slice(0, 5).map((c, i) => <span key={i} className="block text-xs">{c.consent_type} {c.version} · {c.granted ? "ניתנה" : "בוטלה"}</span>)}</p>
            </CardContent>
          </Card>
          {canModerate && id !== me.id && <UserActionsPanel userId={id} currentStatus={u.account_status} reviewLevel={u.review_level} maxListings={u.max_active_listings} />}
          {isSuper && id !== me.id && <RolesPanel userId={id} roles={(userRoles.data ?? []).map((r) => r.role)} />}
        </aside>
      </div>
    </div>
  );
}
