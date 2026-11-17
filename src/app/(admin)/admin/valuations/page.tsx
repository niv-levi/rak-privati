import { requireRole, hasRole } from "@/lib/auth/guards";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ValuationSourceForm } from "@/features/admin/components/valuation-source-form";
import { formatDateTime, formatPrice } from "@/lib/format";

export default async function AdminValuationsPage() {
  const { supabase, roles } = await requireRole("any", "/admin/valuations");
  const canManage = hasRole(roles, "data_manager");
  const [{ data: sources }, { data: recent }] = await Promise.all([
    supabase.from("vehicle_valuation_sources").select("key, name_he, source_type, status, config, priority, enabled, label_he, disclaimer_he").order("priority"),
    supabase.from("vehicle_valuations").select("id, created_at, estimated_low, estimated_mid, estimated_high, confidence, comparable_count, input").order("created_at", { ascending: false }).limit(20),
  ]);
  return (
    <div className="space-y-6">
      <PageHeader title="הגדרות הערכת שווי" description="המקור הפנימי מציג מחירי פרסום של מודעות דומות בלבד, ורק מעל סף מינימלי של מודעות. ספקים מסחריים דורשים הסכם." className="py-0" />
      <ul className="grid gap-4 lg:grid-cols-3">
        {(sources ?? []).map((s) => { const cfg = s.config as { min_comparables?: number; window_days?: number }; return (
          <li key={s.key}><Card className="h-full"><CardHeader><div className="flex items-start justify-between gap-2"><CardTitle className="text-base">{s.name_he}</CardTitle><Badge variant={s.status === "configured" ? "success" : "muted"}>{s.status}</Badge></div><CardDescription>{s.label_he} · עדיפות {s.priority}</CardDescription></CardHeader>
            <CardContent className="space-y-2 text-sm"><p className="text-muted-foreground">{s.disclaimer_he}</p>{s.source_type === "internal_listings" && canManage && <ValuationSourceForm sourceKey={s.key} enabled={s.enabled} minComparables={cfg.min_comparables ?? 5} windowDays={cfg.window_days ?? 120} />}{s.source_type !== "internal_listings" && <p className="text-xs text-muted-foreground">יחובר רק לאחר הסכם/אישור הרשאות. אין תוצאות מדומות.</p>}</CardContent></Card></li>
        ); })}
      </ul>
      <Card>
        <CardHeader><CardTitle className="text-base">הערכות אחרונות</CardTitle></CardHeader>
        <CardContent>
          {(recent ?? []).length === 0 ? <p className="text-sm text-muted-foreground">אין הערכות עדיין.</p> : (
            <table className="w-full text-sm"><caption className="sr-only">הערכות אחרונות</caption><thead className="text-xs text-muted-foreground"><tr><th scope="col" className="p-2 text-start">תאריך</th><th scope="col" className="p-2 text-start">שנה</th><th scope="col" className="p-2 text-start">טווח</th><th scope="col" className="p-2 text-start">מודעות דומות</th><th scope="col" className="p-2 text-start">ביטחון</th></tr></thead>
              <tbody>{(recent ?? []).map((v) => <tr key={v.id} className="border-t border-border"><td className="p-2"><span className="num">{formatDateTime(v.created_at)}</span></td><td className="p-2"><span className="num">{(v.input as { year?: number }).year ?? "—"}</span></td><td className="p-2"><span className="num">{v.estimated_low ? `${formatPrice(v.estimated_low)} – ${formatPrice(v.estimated_high)}` : "לא חושב"}</span></td><td className="p-2"><span className="num">{v.comparable_count}</span></td><td className="p-2">{v.confidence}</td></tr>)}</tbody></table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
