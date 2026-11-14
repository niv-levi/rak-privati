import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, Camera, FileCheck2, Search, ShieldCheck, Smartphone, UserRoundCheck, Ban } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { getCurrentUser } from "@/lib/supabase/server";
import { createDraftAction } from "@/features/sell/actions";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { PRIVATE_SELLER_DECLARATION_TEXT } from "@/features/consents/text";

export const metadata: Metadata = {
  title: "פרסום רכב למכירה – למוכרים פרטיים בלבד",
  description: "פרסום רכב פרטי למכירה ברק פרטי: מזינים מספר רישוי, מאשרים פרטים, מעלים תמונות ומצהירים שאתם מוכרים פרטיים. ללא סוחרים.",
  alternates: { canonical: "/sell" },
};

const steps = [
  { icon: Search, title: "מספר רישוי", text: "נשלוף את פרטי הרכב מהמקורות הרשמיים ונחסוך לך הקלדה." },
  { icon: FileCheck2, title: "אישור והשלמה", text: "מאשרים את הפרטים, משלימים קילומטראז׳, מחיר ומצב הרכב." },
  { icon: Camera, title: "תמונות", text: "3–15 תמונות. אנחנו ממטבים אותן ומסירים נתוני מיקום." },
  { icon: UserRoundCheck, title: "הצהרת מוכר פרטי", text: "מצהירים שאתם מוכרים פרטיים – זה מה שמבדיל את הלוח הזה." },
  { icon: ShieldCheck, title: "בדיקה ופרסום", text: "כל מודעה עוברת בדיקה אנושית לפני שהיא עולה לאוויר." },
];

export default async function SellPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sp = await searchParams;
  const plate = typeof sp.plate === "string" ? sp.plate.replace(/\D/g, "").slice(0, 8) : undefined;
  const user = await getCurrentUser();
  const configured = isSupabaseConfigured();
  const start = createDraftAction.bind(null, plate);

  return (
    <div className="pb-16">
      <section className="bg-brand-dark text-white">
        <div className="container-page grid gap-10 py-14 lg:grid-cols-2 lg:items-center lg:py-20">
          <div className="space-y-6">
            <p className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-sm font-semibold"><ShieldCheck className="size-4 text-brand-amber" aria-hidden /> למוכרים פרטיים בלבד</p>
            <h1 className="text-display font-extrabold">מוכרים את הרכב שלכם? כאן קונים יודעים שהם מדברים עם אדם, לא עם מגרש.</h1>
            <p className="max-w-xl text-lg text-white/80 leading-relaxed">פרסום פשוט שמתחיל ממספר הרישוי, נתונים רשמיים שמחזקים את האמון, ומספר טלפון שנחשף רק לקונים מחוברים.</p>
            <div className="flex flex-wrap gap-3">
              {user ? (
                <form action={start}><Button type="submit" size="lg" variant="accent" disabled={!configured}>התחלת פרסום <ArrowLeft aria-hidden /></Button></form>
              ) : (
                <Link href={`/login?next=${encodeURIComponent(plate ? `/sell?plate=${plate}` : "/sell")}`} className={buttonVariants({ size: "lg", variant: "accent" })}><Smartphone aria-hidden /> כניסה עם טלפון והתחלת פרסום</Link>
              )}
              <Link href="/private-seller-policy" className={buttonVariants({ size: "lg", variant: "outline", className: "border-white/30 bg-transparent text-white hover:bg-white/10" })}>מי יכול לפרסם?</Link>
            </div>
            <p className="text-sm text-white/60">חינם בתקופת ההשקה · עד 2 מודעות פעילות לחשבון</p>
          </div>
          <ol className="grid gap-3 sm:grid-cols-2">
            {steps.map((s, i) => (
              <li key={s.title} className="rounded-lg bg-white/10 p-4">
                <div className="mb-2 flex items-center gap-2"><span className="flex size-7 items-center justify-center rounded-full bg-brand-amber text-xs font-bold text-white num">{i + 1}</span><s.icon className="size-5 text-white/80" aria-hidden /></div>
                <p className="font-bold">{s.title}</p>
                <p className="text-sm text-white/70">{s.text}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>
      <section className="container-page grid gap-6 py-14 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardContent className="space-y-4 pt-6">
            <h2 className="text-h2 font-extrabold">ההצהרה שכל מוכר חותם עליה</h2>
            <blockquote className="rounded-md border-s-4 border-primary bg-primary-soft p-4 leading-relaxed">{PRIVATE_SELLER_DECLARATION_TEXT}</blockquote>
            <p className="text-sm text-muted-foreground">ההצהרה נשמרת עם תאריך וגרסה ומצורפת לכל מודעה. מודעות של סוחרים, מגרשים, חברות ליסינג או כל גורם מסחרי – מוסרות, והחשבון נחסם.</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="space-y-3 pt-6 text-sm">
            <h2 className="flex items-center gap-2 text-base font-bold"><Ban className="size-5 text-destructive" aria-hidden /> מה לא מפרסמים כאן</h2>
            <ul className="list-disc space-y-1 ps-5 text-muted-foreground">
              <li>רכבים של מגרשים, סוחרים או "מתווכים"</li>
              <li>מלאי של חברות ליסינג והשכרה</li>
              <li>רכב שאינו שלכם או של בן/בת משפחה קרוב/ה מטעמכם</li>
              <li>אופנועים, משאיות ורכבים מסחריים כבדים (בשלב זה)</li>
            </ul>
            <Link href="/how-it-works" className="inline-block font-semibold text-primary underline-offset-4 hover:underline">איך זה עובד לקונים ולמוכרים</Link>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
