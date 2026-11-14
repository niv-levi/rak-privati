import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/layout/page-header";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { ValuationForm } from "@/features/valuation/components/valuation-form";
import { getMakes, getModels } from "@/features/listings/queries/catalog";
import { createSupabaseServerClient, getCurrentUser } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "הערכת שווי רכב – טווח מחירי פרסום",
  description: "בדיקת טווח מחיר לרכב יד שנייה על בסיס מחירי פרסום של מודעות דומות ממוכרים פרטיים. ללא מחירים מומצאים – רק כשיש מספיק נתונים.",
  alternates: { canonical: "/valuation" },
};

export default async function ValuationPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sp = await searchParams;
  const [makes, models, user, supabase] = await Promise.all([getMakes(), getModels(), getCurrentUser(), createSupabaseServerClient()]);
  let initial: { make_id: string; model_id: string; year: number; mileage_km: number; asking_price: number; ownership_count: number } | undefined;
  if (typeof sp.listing === "string" && user && supabase) {
    const { data: l } = await supabase.from("listings").select("make_id, model_id, year, mileage_km, price, ownership_count_declared").eq("id", sp.listing).eq("seller_id", user.id).maybeSingle();
    if (l?.make_id && l.model_id && l.year) initial = { make_id: l.make_id, model_id: l.model_id, year: l.year, mileage_km: l.mileage_km ?? 0, asking_price: l.price ?? 0, ownership_count: l.ownership_count_declared ?? 0 };
  }
  return (
    <div className="container-page pb-16">
      <PageHeader eyebrow="כלי לקונים ולמוכרים" title="הערכת שווי רכב" description="אנחנו מציגים טווח של מחירי פרסום של מודעות דומות ברק פרטי – לא מחירי עסקאות ולא הערכת שמאי. הטווח מחושב רק כשיש מספיק מודעות דומות, ואנחנו מסבירים אילו גורמים נלקחו בחשבון ומה לא." />
      <Alert variant="info" className="mb-6">
        <AlertTitle>מקורות ההערכה</AlertTitle>
        <AlertDescription>כרגע פעיל מקור אחד: מודעות דומות בלוח (מחירים מבוקשים). ספק הערכת שווי מסחרי ומחירון ממשלתי יחוברו רק לאחר הסדרת הרשאות שימוש. <Link href="/data-sources" className="font-semibold underline underline-offset-4">פרטים</Link></AlertDescription>
      </Alert>
      <ValuationForm makes={makes} models={models} initial={initial} />
    </div>
  );
}
