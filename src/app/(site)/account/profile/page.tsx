import { requireUser, getProfile } from "@/lib/auth/guards";
import { PageHeader } from "@/components/layout/page-header";
import { ProfileForm } from "@/features/account/components/profile-form";
import { getGeo } from "@/features/listings/queries/catalog";
import { getActiveDeclaration } from "@/features/consents/service";
import { formatIsraeliPhone, formatDate } from "@/lib/format";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DeclarationControls } from "@/features/account/components/declaration-controls";

export const metadata = { title: "הפרופיל שלי", robots: { index: false } };

export default async function ProfilePage() {
  const { user, supabase } = await requireUser("/account/profile");
  const [profile, geo, decl, consents] = await Promise.all([getProfile(), getGeo(), getActiveDeclaration(supabase, user.id), supabase.from("consent_records").select("consent_type, version, granted, granted_at").eq("user_id", user.id).order("granted_at", { ascending: false }).limit(20)]);
  const latestByType = new Map<string, { version: string; granted: boolean; granted_at: string }>();
  for (const c of consents.data ?? []) if (!latestByType.has(c.consent_type)) latestByType.set(c.consent_type, c);
  const labels: Record<string, string> = { terms: "תנאי שימוש", privacy: "מדיניות פרטיות", private_seller_declaration: "הצהרת מוכר פרטי", contact_sharing: "שיתוף פרטי קשר", marketing: "דיוור שיווקי" };
  return (
    <div className="space-y-8">
      <PageHeader title="הפרופיל שלי" className="py-0" />
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>פרטים אישיים</CardTitle><CardDescription>השם מוצג לקונים במודעות שלכם. העיר משמשת להצעות חיפוש בלבד.</CardDescription></CardHeader>
          <CardContent><ProfileForm initial={{ display_name: profile?.display_name ?? "", city_id: profile?.city_id ?? "" }} cities={geo.cities} /></CardContent>
        </Card>
        <div className="space-y-6">
          <Card>
            <CardHeader><CardTitle>טלפון מאומת</CardTitle></CardHeader>
            <CardContent className="space-y-2 text-sm">
              <p className="num text-lg font-bold">{formatIsraeliPhone(profile?.phone_e164)}</p>
              <p className="text-muted-foreground">אומת ב-<span className="num">{formatDate(profile?.phone_verified_at)}</span>. המספר לא מוצג בפומבי; קונים מחוברים יכולים לחשוף אותו רק במודעות שבהן אישרתם זאת.</p>
              <Badge variant="success">טלפון מאומת</Badge> <span className="text-xs text-muted-foreground">(אינו אימות זהות או בעלות)</span>
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle>הצהרת מוכר פרטי</CardTitle></CardHeader>
            <CardContent className="space-y-3 text-sm">
              {decl ? <p>הצהרה פעילה מ-<span className="num">{formatDate(decl.declared_at)}</span> (גרסה <span className="num">{decl.declaration_version}</span>).</p> : <p className="text-muted-foreground">עדיין לא הצהרת. ההצהרה ניתנת בתהליך פרסום הרכב.</p>}
              {decl && <DeclarationControls />}
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle>הסכמות</CardTitle><CardDescription>כל הסכמה נשמרת כרשומה בלתי ניתנת לשינוי עם גרסה ותאריך.</CardDescription></CardHeader>
            <CardContent>
              <ul className="divide-y divide-border text-sm">
                {[...latestByType.entries()].map(([type, c]) => (
                  <li key={type} className="flex items-center justify-between py-2"><span>{labels[type] ?? type}</span><span className="text-muted-foreground">{c.granted ? "ניתנה" : "בוטלה"} · גרסה <span className="num">{c.version}</span> · <span className="num">{formatDate(c.granted_at)}</span></span></li>
                ))}
                {latestByType.size === 0 && <li className="py-2 text-muted-foreground">אין רשומות הסכמה.</li>}
              </ul>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
