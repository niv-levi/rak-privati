import { requireRole, hasRole } from "@/lib/auth/guards";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { CatalogForms } from "@/features/admin/components/catalog-forms";
import { formatDateTime } from "@/lib/format";

export default async function AdminCatalogPage() {
  const { supabase, roles } = await requireRole("any", "/admin/catalog");
  const canManage = hasRole(roles, "data_manager");
  const [{ data: makes }, { count: modelCount }, { count: cityCount }, { data: runs }] = await Promise.all([
    supabase.from("vehicle_makes").select("id, slug, name_he, name_en, is_popular, active").order("sort_order").order("name_he"),
    supabase.from("vehicle_models").select("id", { count: "exact", head: true }),
    supabase.from("geo_cities").select("id", { count: "exact", head: true }),
    supabase.from("catalog_import_runs").select("id, source, status, rows_received, rows_inserted, rows_updated, rows_skipped, created_at").order("created_at", { ascending: false }).limit(10),
  ]);
  const { data: modelCounts } = await supabase.from("vehicle_models").select("make_id");
  const perMake = new Map<string, number>(); for (const m of modelCounts ?? []) perMake.set(m.make_id, (perMake.get(m.make_id) ?? 0) + 1);
  return (
    <div className="space-y-6">
      <PageHeader title="קטלוג רכבים ויישובים" description={<><span className="num">{makes?.length ?? 0}</span> יצרנים · <span className="num">{modelCount ?? 0}</span> דגמים · <span className="num">{cityCount ?? 0}</span> יישובים</>} className="py-0" />
      <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
        <Card>
          <CardHeader><CardTitle>יצרנים</CardTitle><CardDescription>דגמים מנוהלים דרך ייבוא CSV או הטופס. אין להמציא רמות גימור – יש לייבא מנתוני יבואן/רישוי מאומתים.</CardDescription></CardHeader>
          <CardContent>
            <div className="max-h-[60vh] overflow-y-auto">
              <table className="w-full text-sm"><caption className="sr-only">יצרנים</caption><thead className="text-xs text-muted-foreground"><tr><th scope="col" className="p-2 text-start">slug</th><th scope="col" className="p-2 text-start">עברית</th><th scope="col" className="p-2 text-start">English</th><th scope="col" className="p-2 text-start">דגמים</th><th scope="col" className="p-2 text-start">פופולרי</th></tr></thead>
                <tbody>{(makes ?? []).map((m) => <tr key={m.id} className="border-t border-border"><td className="p-2 num" dir="ltr">{m.slug}</td><td className="p-2">{m.name_he}</td><td className="p-2" dir="ltr">{m.name_en}</td><td className="p-2 num">{perMake.get(m.id) ?? 0}</td><td className="p-2">{m.is_popular ? "כן" : ""}</td></tr>)}</tbody>
              </table>
            </div>
          </CardContent>
        </Card>
        <div className="space-y-6">
          {canManage ? <CatalogForms makes={(makes ?? []).map((m) => ({ id: m.id, name_he: m.name_he }))} /> : <Card><CardContent className="pt-6 text-sm text-muted-foreground">עדכון הקטלוג דורש תפקיד מנהל נתונים.</CardContent></Card>}
          <Card>
            <CardHeader><CardTitle className="text-base">ייבואים אחרונים</CardTitle></CardHeader>
            <CardContent>{(runs ?? []).length === 0 ? <p className="text-sm text-muted-foreground">אין ייבואים.</p> : <ul className="divide-y divide-border text-sm">{(runs ?? []).map((r) => <li key={r.id} className="py-2"><span className="font-semibold">{r.source}</span> · {r.status} · <span className="num">{r.rows_inserted}+ / {r.rows_updated}~ / {r.rows_skipped}✕</span><p className="text-xs text-muted-foreground num">{formatDateTime(r.created_at)}</p></li>)}</ul>}</CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
