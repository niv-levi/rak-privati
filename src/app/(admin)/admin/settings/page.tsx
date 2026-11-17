import { requireRole, hasRole } from "@/lib/auth/guards";
import { PageHeader } from "@/components/layout/page-header";
import { SettingsTable } from "@/features/admin/components/settings-table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDateTime } from "@/lib/format";

export default async function AdminSettingsPage() {
  const { supabase, roles } = await requireRole("any", "/admin/settings");
  const canEdit = hasRole(roles, "super_admin");
  const [{ data: settings }, { data: policies }] = await Promise.all([
    supabase.from("application_settings").select("key, value, description, updated_at").order("key"),
    supabase.from("policy_versions").select("policy_type, version, title, is_current, effective_from").order("policy_type").order("effective_from", { ascending: false }),
  ]);
  return (
    <div className="space-y-6">
      <PageHeader title="הגדרות המערכת" description="ערכים נשמרים כ-JSON. שינוי מגבלת המודעות או ספי הדגלים נכנס לתוקף מיד וללא פריסה." className="py-0" />
      <SettingsTable settings={(settings ?? []).map((s) => ({ ...s, value: JSON.stringify(s.value) }))} canEdit={canEdit} />
      <Card>
        <CardHeader><CardTitle className="text-base">גרסאות מסמכי מדיניות</CardTitle></CardHeader>
        <CardContent><table className="w-full text-sm"><caption className="sr-only">גרסאות מדיניות</caption><thead className="text-xs text-muted-foreground"><tr><th scope="col" className="p-2 text-start">סוג</th><th scope="col" className="p-2 text-start">גרסה</th><th scope="col" className="p-2 text-start">כותרת</th><th scope="col" className="p-2 text-start">בתוקף מ-</th><th scope="col" className="p-2 text-start">נוכחית</th></tr></thead><tbody>{(policies ?? []).map((p, i) => <tr key={i} className="border-t border-border"><td className="p-2" dir="ltr">{p.policy_type}</td><td className="p-2"><span className="num">{p.version}</span></td><td className="p-2">{p.title}</td><td className="p-2"><span className="num">{formatDateTime(p.effective_from)}</span></td><td className="p-2">{p.is_current ? "כן" : ""}</td></tr>)}</tbody></table><p className="mt-3 text-xs text-muted-foreground">פרסום גרסה חדשה של מסמך מדיניות מתבצע במיגרציה (insert ל-policy_versions עם is_current) כדי שההסכמות יישמרו מול גרסה מתועדת.</p></CardContent>
      </Card>
    </div>
  );
}
