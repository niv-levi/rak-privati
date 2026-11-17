import type { Metadata } from "next";
import Link from "next/link";
import { Search, FileSearch, Scale, Phone, ShieldCheck, Camera, UserRoundCheck, Eye, Bell, Heart } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";

export const metadata: Metadata = { title: "איך זה עובד", description: "איך קונים ומוכרים רכב ברק פרטי – צעד אחר צעד, לקונים ולמוכרים.", alternates: { canonical: "/how-it-works" } };

const buyer = [
  { icon: Search, t: "מחפשים", d: "סינון לפי יצרן, דגם, מחיר, שנה, קילומטראז׳, אזור ורדיוס. כל התוצאות ממוכרים פרטיים שעברו בדיקה." },
  { icon: FileSearch, t: "בודקים", d: "בכל מודעה מופיעים נתונים רשמיים זמינים בנפרד מהצהרות המוכר. אפשר גם לבדוק כל רכב לפי מספר רישוי." },
  { icon: Scale, t: "משווים", d: "טווח מחירי פרסום של רכבים דומים, השוואה של עד 3 רכבים זה לצד זה, שמירת רכבים וחיפושים." },
  { icon: Phone, t: "מדברים", d: "מתחברים עם טלפון, לוחצים על הצגת מספר – ומדברים ישירות עם האדם שמוכר. בטלפון או ב-WhatsApp." },
];
const seller = [
  { icon: FileSearch, t: "מספר רישוי", d: "מזינים את מספר הרישוי. אנחנו שולפים את פרטי הרכב מהמקורות הרשמיים ומציגים לאישורכם." },
  { icon: Camera, t: "פרטים ותמונות", d: "משלימים קילומטראז׳, מחיר, מצב ותיאור כן. מעלים 3–15 תמונות; אנחנו ממטבים ומסירים נתוני מיקום." },
  { icon: UserRoundCheck, t: "הצהרת מוכר פרטי", d: "מאשרים שאתם מוכרים את הרכב כאנשים פרטיים. ההצהרה נשמרת עם גרסה ותאריך ומצורפת למודעה." },
  { icon: Eye, t: "בדיקה ופרסום", d: "צוות אנושי בודק כל מודעה לפני שהיא עולה. אחרי האישור – קונים עם חיפוש שמור מתאים מקבלים התראה." },
];

export default function HowItWorksPage() {
  return (
    <div className="container-page pb-16">
      <PageHeader eyebrow="רכב קונים מאנשים. לא מסוחרים." title="איך זה עובד" description="שני תהליכים קצרים, עיקרון אחד: שקיפות. מה שאומת – מסומן. מה שהוצהר – מסומן. מה שלא ידוע – נכתב." />
      <div className="grid gap-10 lg:grid-cols-2">
        <section aria-labelledby="buyers">
          <h2 id="buyers" className="text-h2 font-extrabold">לקונים</h2>
          <ol className="mt-4 space-y-3">{buyer.map((s, i) => <li key={s.t}><Card><CardContent className="flex gap-4 pt-5"><span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary text-white"><s.icon className="size-5" aria-hidden /></span><div><p className="font-bold"><span className="num text-primary">{i + 1}.</span> {s.t}</p><p className="text-sm text-muted-foreground leading-relaxed">{s.d}</p></div></CardContent></Card></li>)}</ol>
          <Link href="/cars" className={buttonVariants({ className: "mt-5" })}>לחיפוש רכב</Link>
        </section>
        <section aria-labelledby="sellers">
          <h2 id="sellers" className="text-h2 font-extrabold">למוכרים</h2>
          <ol className="mt-4 space-y-3">{seller.map((s, i) => <li key={s.t}><Card><CardContent className="flex gap-4 pt-5"><span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-accent text-white"><s.icon className="size-5" aria-hidden /></span><div><p className="font-bold"><span className="num text-brand-amber">{i + 1}.</span> {s.t}</p><p className="text-sm text-muted-foreground leading-relaxed">{s.d}</p></div></CardContent></Card></li>)}</ol>
          <Link href="/sell" className={buttonVariants({ variant: "accent", className: "mt-5" })}>פרסום רכב</Link>
        </section>
      </div>
      <section className="mt-14 grid gap-6 md:grid-cols-3" aria-label="מה עוד">
        {[
          { icon: ShieldCheck, t: "מה מסומן ומה לא", d: "\"טלפון מאומת\" ו\"הצהרת מוכר פרטי\" הם הסימונים היחידים שאנחנו מציגים. אין \"בעלות מאומתת\" – כי אין לנו דרך לאמת בעלות." },
          { icon: Bell, t: "התראות חכמות", d: "אישור מודעה, פניות, ירידת מחיר ברכב ששמרתם ורכבים חדשים שמתאימים לחיפוש שמור. דיוור שיווקי – רק בהסכמה נפרדת." },
          { icon: Heart, t: "הגנה על המוכרים", d: "מספר הטלפון נחשף רק למשתמשים מחוברים אחרי לחיצה מכוונת. כל חשיפה מתועדת ומוגבלת בקצב כדי למנוע ספאם." },
        ].map((x) => <Card key={x.t}><CardContent className="pt-6"><x.icon className="size-6 text-primary" aria-hidden /><h3 className="mt-2 font-bold">{x.t}</h3><p className="mt-1 text-sm text-muted-foreground leading-relaxed">{x.d}</p></CardContent></Card>)}
      </section>
    </div>
  );
}
