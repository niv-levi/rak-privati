import type { Metadata } from "next";
import Link from "next/link";
import { Database, FileSearch, ShieldCheck, Clock } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { buttonVariants } from "@/components/ui/button";
import { LookupForm } from "@/features/vehicle-check/components/lookup-form";
import { VehicleReportView } from "@/features/vehicle-check/components/vehicle-report";
import { SaveReportButton } from "@/features/vehicle-check/components/save-report-button";
import { lookupVehicle } from "@/features/vehicle-check/service";
import { getCurrentUser } from "@/lib/supabase/server";
import { getClientIp } from "@/lib/security/request";
import { getProviderHealth } from "@/lib/providers/registry";
import { providerStatusLabels } from "@/lib/labels";

export const metadata: Metadata = {
  title: "בדיקת רכב לפי מספר רישוי",
  description: "בדיקת רכב חינמית לפי מספר רישוי: נתוני משרד התחבורה, נסועה מתועדת, היסטוריית בעלויות וקריאות שירות – עם ציון מקור ותאריך לכל נתון.",
  alternates: { canonical: "/vehicle-check" },
  robots: { index: true, follow: true },
};

export default async function VehicleCheckPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sp = await searchParams;
  const plateInput = typeof sp.plate === "string" ? sp.plate : "";
  const user = await getCurrentUser();
  const health = await getProviderHealth();
  const govConfigured = health.filter((h) => h.kind.startsWith("government")).some((h) => h.configured || h.usingFixtures);

  const outcome = plateInput ? await lookupVehicle({ plate: plateInput, userId: user?.id ?? null, ip: await getClientIp(), purpose: "check" }) : null;

  return (
    <div className="container-page pb-16">
      <PageHeader
        eyebrow="שקיפות לפני שמדברים עם המוכר"
        title="בדיקת רכב לפי מספר רישוי"
        description="מזינים מספר רישוי ומקבלים דוח מסודר מהמקורות הציבוריים הזמינים: פרטי הרכב, נסועה שנרשמה בטסטים, היסטוריית סוג בעלות וקריאות שירות. לכל נתון מצוין המקור והתאריך."
      />
      <div className="grid gap-8 lg:grid-cols-[1fr_360px]">
        <div className="space-y-8">
          <Card>
            <CardContent className="pt-6">
              <LookupForm initial={plateInput} autoFocus={!plateInput} />
            </CardContent>
          </Card>

          {!govConfigured && (
            <Alert variant="warning">
              <AlertTitle>מקורות המידע הממשלתיים טרם חוברו בסביבה זו</AlertTitle>
              <AlertDescription>
                מתאמי data.gov.il קיימים אך מזהי המאגרים לא הוגדרו. עד להגדרתם הדוח יציג &quot;המקור לא הוגדר&quot; עבור כל שדה. ראו /admin/vehicle-data ו-docs/DATA_SOURCES.md.
              </AlertDescription>
            </Alert>
          )}

          {outcome && !outcome.ok && (
            <Alert variant={outcome.code === "invalid" ? "warning" : "destructive"} role="alert">
              <AlertTitle>{outcome.code === "invalid" ? "מספר הרישוי אינו תקין" : outcome.code === "rate_limited" ? "הגעת למגבלת הבדיקות" : "השירות אינו זמין כרגע"}</AlertTitle>
              <AlertDescription>
                {outcome.error}
                {outcome.code === "rate_limited" && !user && <> <Link href="/login?next=/vehicle-check" className="font-semibold underline underline-offset-4">כניסה</Link></>}
              </AlertDescription>
            </Alert>
          )}

          {outcome?.ok && (
            <section aria-label="דוח הרכב" className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="text-sm text-muted-foreground">{outcome.cached ? "הדוח נשלף מבדיקה שבוצעה ב-24 השעות האחרונות." : "הדוח הופק כעת מהמקורות הזמינים."}</p>
                <div className="flex gap-2">
                  <SaveReportButton resultId={outcome.resultId} loggedIn={!!user} title={[outcome.report.identification.make.value, outcome.report.identification.commercialName.value, outcome.report.identification.year.value].filter(Boolean).join(" ")} />
                  <Link href={`/sell?plate=${outcome.plate}`} className={buttonVariants({ variant: "accent" })}>זה הרכב שלי – לפרסום</Link>
                </div>
              </div>
              <VehicleReportView report={outcome.report} />
            </section>
          )}
        </div>
        <aside className="space-y-4 lg:sticky lg:top-24 lg:self-start">
          <Card>
            <CardContent className="space-y-4 pt-6 text-sm">
              <h2 className="text-base font-bold">מה כולל הדוח?</h2>
              <ul className="space-y-3">
                <li className="flex gap-3"><FileSearch className="size-5 shrink-0 text-primary" aria-hidden /><span>זיהוי הרכב, מפרט בסיסי, תוקף רישוי וטסט אחרון ממאגר משרד התחבורה.</span></li>
                <li className="flex gap-3"><Clock className="size-5 shrink-0 text-primary" aria-hidden /><span>נסועה שנרשמה בטסטים והיסטוריית סוג בעלות – כשהן קיימות במקור.</span></li>
                <li className="flex gap-3"><ShieldCheck className="size-5 shrink-0 text-primary" aria-hidden /><span>קריאות שירות (ריקול) שפורסמו.</span></li>
                <li className="flex gap-3"><Database className="size-5 shrink-0 text-primary" aria-hidden /><span>ציון מקור, תאריך שליפה וסטטוס לכל נתון. מה שלא נמצא – נכתב במפורש.</span></li>
              </ul>
              <p className="text-xs text-muted-foreground">הדוח אינו כולל היסטוריית תאונות או ביטוח – מידע כזה דורש ספק מסחרי שטרם חובר. <Link href="/data-sources" className="underline underline-offset-4">על מקורות המידע</Link></p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6 text-sm">
              <h2 className="text-base font-bold">מצב המקורות</h2>
              <ul className="mt-3 space-y-2">
                {health.filter((h) => h.kind.startsWith("government") || h.kind === "commercial_history").map((h) => (
                  <li key={h.key} className="flex items-center justify-between gap-2">
                    <span className="text-muted-foreground">{h.nameHe.split(" – ")[0]}</span>
                    <span className={h.configured || h.usingFixtures ? "font-semibold text-success" : "font-semibold text-muted-foreground"}>{h.usingFixtures ? "נתוני פיתוח" : providerStatusLabels[(h.configured ? "configured" : "not_configured") as "configured" | "not_configured"]}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </aside>
      </div>
    </div>
  );
}
