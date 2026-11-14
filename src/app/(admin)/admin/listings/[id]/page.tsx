import Link from "next/link";
import { notFound } from "next/navigation";
import Image from "next/image";
import { requireRole, hasRole } from "@/lib/auth/guards";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { SpecSheet } from "@/features/listings/components/detail/spec-sheet";
import { OfficialDataCard } from "@/features/listings/components/detail/official-data-card";
import { ModerationPanel } from "@/features/admin/components/moderation-panel";
import { FlagList } from "@/features/admin/components/flag-list";
import { resolveImageUrls } from "@/features/images/urls";
import { formatDateTime, formatPlate, formatPrice } from "@/lib/format";
import { listingStatusLabels } from "@/lib/labels";
import type { VehicleReport } from "@/lib/providers/types";

export default async function AdminListingDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase, roles } = await requireRole("any", `/admin/listings/${id}`);
  const { data: l } = await supabase.from("listings").select("*").eq("id", id).maybeSingle();
  if (!l) notFound();
  const [priv, imgs, seller, decl, flags, actions, reports, dupes, sellerListings, city] = await Promise.all([
    supabase.from("listing_private_data").select("plate_number").eq("listing_id", id).maybeSingle(),
    supabase.from("listing_images").select("id, storage_path, alt_text, is_cover, sort_order, content_hash, perceptual_hash").eq("listing_id", id).order("is_cover", { ascending: false }).order("sort_order"),
    supabase.from("profiles").select("id, display_name, phone_e164, phone_verified_at, account_status, review_level, max_active_listings, created_at").eq("id", l.seller_id).maybeSingle(),
    l.declaration_id ? supabase.from("seller_declarations").select("declaration_version, declared_at, revoked_at").eq("id", l.declaration_id).maybeSingle() : Promise.resolve({ data: null }),
    supabase.from("moderation_flags").select("id, flag_type, severity, status, details, created_at, resolution").eq("listing_id", id).order("created_at", { ascending: false }),
    supabase.from("moderation_actions").select("id, action, reason, notes, created_at, actor_id").eq("listing_id", id).order("created_at", { ascending: false }),
    supabase.from("listing_reports").select("id, reason, details, status, created_at").eq("listing_id", id).order("created_at", { ascending: false }),
    l.plate_hash ? supabase.from("listings").select("id, seller_id, status, created_at").eq("plate_hash", l.plate_hash).neq("id", id) : Promise.resolve({ data: [] }),
    supabase.from("listings").select("id, make_name, model_name, status, created_at").eq("seller_id", l.seller_id).neq("id", id).order("created_at", { ascending: false }).limit(10),
    l.city_id ? supabase.from("geo_cities").select("name_he").eq("id", l.city_id).maybeSingle() : Promise.resolve({ data: null }),
  ]);
  const urls = await resolveImageUrls(imgs.data ?? [], { persist: false });
  const canModerate = hasRole(roles, "moderator");
  const report = l.official_data as unknown as VehicleReport | null;
  return (
    <div className="space-y-6">
      <PageHeader title={`${l.make_name ?? "—"} ${l.model_name ?? ""} ${l.year ?? ""}`} description={<>סטטוס: <Badge variant="muted">{listingStatusLabels[l.status]}</Badge> · נשלחה: <span className="num">{formatDateTime(l.submitted_at)}</span> · מחיר: <span className="num">{formatPrice(l.price)}</span></>} className="py-0" actions={<Link href={`/cars/${l.id}`} className="text-sm font-semibold text-primary underline-offset-4 hover:underline">תצוגה ציבורית</Link>} />
      <div className="grid gap-6 xl:grid-cols-[1fr_380px]">
        <div className="space-y-6">
          <Card>
            <CardHeader><CardTitle>תמונות ({imgs.data?.length ?? 0})</CardTitle></CardHeader>
            <CardContent>
              <ul className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                {(imgs.data ?? []).map((i) => <li key={i.id} className="relative aspect-[4/3] overflow-hidden rounded-md bg-secondary">{urls.get(i.storage_path) && <Image src={urls.get(i.storage_path)!} alt={i.alt_text ?? ""} fill sizes="200px" className="object-cover" unoptimized />}{i.is_cover && <span className="absolute start-1 top-1 rounded bg-primary px-1.5 text-[10px] font-bold text-white">שער</span>}</li>)}
              </ul>
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle>פרטי הרכב (הצהרות המוכר ונתונים רשמיים)</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm">מספר רישוי מלא (לצוות בלבד): <span className="num font-bold">{formatPlate(priv.data?.plate_number)}</span> · עיר: {city.data?.name_he ?? "—"}</p>
              <SpecSheet data={{ ...l, equipment: l.equipment ?? [], official_ownership_type: report?.registration.ownershipType.value ?? null }} />
              <div><h3 className="font-bold">תיאור</h3><p className="whitespace-pre-line text-sm">{l.description || "—"}</p></div>
              <div className="grid gap-3 text-sm sm:grid-cols-2"><p><strong>טיפולים:</strong> {l.maintenance_history || "—"}</p><p><strong>תאונה:</strong> {l.accident_declared ? `כן – ${l.accident_details ?? ""}` : l.accident_declared === false ? "לא" : "—"} · <strong>פחחות:</strong> {l.body_repairs_declared ? `כן – ${l.body_repair_details ?? ""}` : l.body_repairs_declared === false ? "לא" : "—"}</p></div>
            </CardContent>
          </Card>
          <OfficialDataCard report={report} fetchedAt={l.official_data_fetched_at} discrepancyNotes={l.discrepancy_notes} plateMasked={l.plate_masked} />
          <Card>
            <CardHeader><CardTitle>היסטוריית בקרה</CardTitle></CardHeader>
            <CardContent>
              {(actions.data ?? []).length === 0 ? <p className="text-sm text-muted-foreground">אין פעולות קודמות.</p> : <ul className="divide-y divide-border text-sm">{(actions.data ?? []).map((a) => <li key={a.id} className="py-2"><span className="font-semibold">{a.action}</span>{a.reason && <> · {a.reason}</>}{a.notes && <p className="text-muted-foreground">{a.notes}</p>}<p className="text-xs text-muted-foreground num">{formatDateTime(a.created_at)}{a.actor_id ? "" : " · מערכת"}</p></li>)}</ul>}
            </CardContent>
          </Card>
        </div>
        <aside className="space-y-6">
          {canModerate ? <ModerationPanel listingId={l.id} status={l.status} /> : <Card><CardContent className="pt-6 text-sm text-muted-foreground">לתפקיד שלך יש הרשאת צפייה בלבד.</CardContent></Card>}
          <Card>
            <CardHeader><CardTitle className="text-base">המוכר</CardTitle></CardHeader>
            <CardContent className="space-y-2 text-sm">
              <p><Link href={`/admin/users/${l.seller_id}`} className="font-bold text-primary underline-offset-4 hover:underline">{seller.data?.display_name ?? "ללא שם"}</Link></p>
              <p className="text-muted-foreground">חשבון מאז <span className="num">{formatDateTime(seller.data?.created_at)}</span></p>
              <p>סטטוס: <Badge variant={seller.data?.account_status === "active" ? "success" : "destructive"}>{seller.data?.account_status}</Badge> · רמת בדיקה: {seller.data?.review_level} · מגבלה: {seller.data?.max_active_listings ?? "ברירת מחדל"}</p>
              <p>הצהרת מוכר פרטי: {decl.data ? <Badge variant={decl.data.revoked_at ? "destructive" : "success"}>{decl.data.revoked_at ? "בוטלה" : `גרסה ${decl.data.declaration_version} · ${formatDateTime(decl.data.declared_at)}`}</Badge> : <Badge variant="destructive">חסרה</Badge>}</p>
              <p>מודעות נוספות של המוכר: {(sellerListings.data ?? []).length === 0 ? "אין" : <ul className="mt-1 list-disc ps-5">{(sellerListings.data ?? []).map((s) => <li key={s.id}><Link href={`/admin/listings/${s.id}`} className="underline-offset-4 hover:underline">{s.make_name} {s.model_name} · {listingStatusLabels[s.status]}</Link></li>)}</ul>}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle className="text-base">איתור כפילויות</CardTitle></CardHeader>
            <CardContent className="space-y-2 text-sm">
              {(dupes.data ?? []).length === 0 ? <p className="text-muted-foreground">מספר הרישוי הזה לא פורסם ממודעות אחרות.</p> : <ul className="list-disc ps-5">{(dupes.data ?? []).map((d) => <li key={d.id}><Link href={`/admin/listings/${d.id}`} className="underline-offset-4 hover:underline">מודעה {d.id.slice(0, 8)} · {listingStatusLabels[d.status]} · {d.seller_id === l.seller_id ? "אותו מוכר" : <strong className="text-destructive">מוכר אחר</strong>}</Link></li>)}</ul>}
            </CardContent>
          </Card>
          <FlagList flags={(flags.data ?? []).map((f) => ({ ...f, details: f.details as Record<string, unknown> }))} canModerate={canModerate} />
          {(reports.data ?? []).length > 0 && <Card><CardHeader><CardTitle className="text-base">דיווחי משתמשים ({reports.data!.length})</CardTitle></CardHeader><CardContent><ul className="space-y-2 text-sm">{reports.data!.map((r) => <li key={r.id} className="rounded-md bg-secondary p-2"><strong>{r.reason}</strong> · {r.status}<p className="text-muted-foreground">{r.details}</p></li>)}</ul></CardContent></Card>}
        </aside>
      </div>
    </div>
  );
}
