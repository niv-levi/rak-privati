import { isoDaysAgo } from "@/lib/time";
import { requireRole, hasRole } from "@/lib/auth/guards";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { getProviderHealth } from "@/lib/providers/registry";
import { ProviderControls, TestLookupForm } from "@/features/admin/components/provider-controls";
import { formatDateTime } from "@/lib/format";

export default async function AdminVehicleDataPage() {
  const { supabase, roles } = await requireRole("any", "/admin/vehicle-data");
  const canManage = hasRole(roles, "data_manager");
  const [health, { data: runs }, { data: lookups }] = await Promise.all([
    getProviderHealth(),
    supabase.from("vehicle_data_sync_runs").select("id, status, started_at, finished_at, rows_processed, error, notes, source_id, vehicle_data_sources(name_he)").order("started_at", { ascending: false }).limit(20),
    supabase.from("vehicle_lookup_requests").select("status").gte("created_at", isoDaysAgo(7)).limit(5000),
  ]);
  const byStatus = new Map<string, number>(); for (const l of lookups ?? []) byStatus.set(l.status, (byStatus.get(l.status) ?? 0) + 1);
  return (
    <div className="space-y-6">
      <PageHeader title="מקורות מידע וספקים" description="כל ספק חושף מצב הגדרה אמיתי. ספק שלא הוגדר לא יוצג כפעיל, ולא יוצגו תוצאות מזויפות." className="py-0" />
      <Alert variant="info">
        <AlertTitle>הגדרת מקורות ממשלתיים (data.gov.il)</AlertTitle>
        <AlertDescription>המתאמים פונים ל-CKAN DataStore הרשמי. יש להגדיר את מזהי המשאבים (GOV_VEHICLE_RESOURCE_ID ועוד) במשתני הסביבה לאחר אימות מול עמוד המאגר, ולבדוק את תנאי הרישיון לשימוש מסחרי. ראו docs/DATA_SOURCES.md.</AlertDescription>
      </Alert>
      <ul className="grid gap-4 lg:grid-cols-2">
        {health.map((h) => (
          <li key={h.key}>
            <Card className="h-full">
              <CardHeader className="flex-row items-start justify-between gap-3 space-y-0">
                <div><CardTitle className="text-base">{h.nameHe}</CardTitle><CardDescription>{h.nameEn} · v{h.version}</CardDescription></div>
                <Badge variant={h.usingFixtures ? "warning" : h.configured ? (h.dbStatus === "error" ? "destructive" : "success") : "muted"}>{h.usingFixtures ? "נתוני פיתוח" : h.configured ? (h.dbStatus === "error" ? "שגיאה" : "מחובר") : "לא הוגדר"}</Badge>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <p><strong>סוג:</strong> {h.kind} · <strong>נתונים:</strong> {h.supportedDataTypes.join(", ")}</p>
                {h.datasetName && <p><strong>מאגר:</strong> {h.datasetName}</p>}
                {h.sourceUrl && <p><strong>מקור:</strong> <a href={h.sourceUrl} className="underline underline-offset-4" dir="ltr" target="_blank" rel="noopener noreferrer">{h.sourceUrl}</a></p>}
                <p><strong>הרשאת שימוש:</strong> {h.usagePermission}</p>
                <p className="text-muted-foreground">{h.hint}</p>
                <p className="text-xs text-muted-foreground">סנכרון/שליפה מוצלחת אחרונה: <span className="num">{formatDateTime(h.lastSuccessAt)}</span>{h.lastError && <> · שגיאה אחרונה: <span dir="ltr">{h.lastError}</span> (<span className="num">{formatDateTime(h.lastErrorAt)}</span>)</>}</p>
                {canManage && h.kind.startsWith("government") && <ProviderControls providerKey={h.key} enabled={h.enabled ?? true} />}
              </CardContent>
            </Card>
          </li>
        ))}
      </ul>
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle className="text-base">בדיקות רכב ב-7 הימים האחרונים</CardTitle></CardHeader>
          <CardContent><ul className="flex flex-wrap gap-2 text-sm">{[...byStatus.entries()].map(([k, v]) => <li key={k}><Badge variant="muted">{k}: {v}</Badge></li>)}{byStatus.size === 0 && <li className="text-muted-foreground">אין בדיקות.</li>}</ul>{canManage && <div className="mt-4"><TestLookupForm /></div>}</CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-base">ריצות סנכרון ובדיקה</CardTitle></CardHeader>
          <CardContent>
            {(runs ?? []).length === 0 ? <p className="text-sm text-muted-foreground">אין ריצות עדיין.</p> : <ul className="divide-y divide-border text-sm">{(runs ?? []).map((r) => <li key={r.id} className="py-2"><span className="font-semibold">{(r.vehicle_data_sources as unknown as { name_he: string } | null)?.name_he}</span> · <Badge variant={r.status === "succeeded" ? "success" : r.status === "failed" ? "destructive" : "warning"}>{r.status}</Badge><p className="text-xs text-muted-foreground num">{formatDateTime(r.started_at)} · {r.rows_processed} שורות{r.error ? ` · ${r.error}` : ""}{r.notes ? ` · ${r.notes}` : ""}</p></li>)}</ul>}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
