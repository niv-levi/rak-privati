import Link from "next/link";
import { Suspense } from "react";
import { ArrowLeft, Search, FileSearch, Scale, ShieldCheck, Users, Ban, Phone, Database, CirclePlus, Car, Eye, Handshake, Sparkles } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { EmptyState } from "@/components/ui/empty-state";
import { HeroSearch } from "@/features/home/components/hero-search";
import { LookupForm } from "@/features/vehicle-check/components/lookup-form";
import { ListingGrid } from "@/features/listings/components/listing-grid";
import { getRecentListings } from "@/features/listings/queries/search";
import { getMakes, getModels, getGeo, getPopularMakes } from "@/features/listings/queries/catalog";
import { siteConfig } from "@/lib/config/site";
import { categoryLabels } from "@/lib/labels";
import { LogoSymbol } from "@/components/brand/logo";

const categories: { key: string; icon: typeof Car }[] = [
  { key: "city", icon: Car }, { key: "family", icon: Users }, { key: "suv", icon: Car }, { key: "electric", icon: Sparkles }, { key: "executive", icon: Car }, { key: "luxury", icon: Car },
];

const faq = [
  { q: "מה ההבדל בין רק פרטי ללוחות רכב אחרים?", a: "כאן אין סוחרים, מגרשים או חברות ליסינג. כל מוכר מאמת מספר טלפון, חותם על הצהרת מוכר פרטי, מוגבל למספר קטן של מודעות, וכל מודעה עוברת בדיקה אנושית לפני פרסום." },
  { q: "איך אתם יודעים שהמוכר באמת פרטי?", a: "אנחנו לא יכולים להבטיח זאת במאה אחוז, ואנחנו אומרים זאת בכנות. אנחנו משלבים אימות טלפון, הצהרה חתומה, מגבלת מודעות, זיהוי אוטומטי של דפוסי סוחרים (אותו רכב מחשבונות שונים, תמונות כפולות, תדירות פרסום) ודיווחי משתמשים – וכל חשד נבדק על ידי אדם." },
  { q: "מה כוללת בדיקת הרכב לפי מספר רישוי?", a: "נתונים ממאגרי משרד התחבורה הפתוחים: זיהוי הרכב, תוקף רישוי, טסט אחרון, נסועה שנרשמה בטסטים והיסטוריית סוג בעלות, וכן קריאות שירות – כשהם זמינים. לכל נתון מצוין המקור והתאריך, ומה שלא נמצא נכתב במפורש." },
  { q: "האם הערכת השווי היא מחיר עסקה?", a: "לא. אנחנו מציגים טווח של מחירי פרסום של מודעות דומות בלוח, ורק כשיש מספיק מודעות. זה לא מחיר שנסגר בפועל ולא הערכת שמאי." },
  { q: "כמה זה עולה?", a: "פרסום וחיפוש חינמיים בתקופת ההשקה." },
];

export default async function HomePage() {
  const [recent, makes, models, geo, popular] = await Promise.all([getRecentListings(8), getMakes(), getModels(), getGeo(), getPopularMakes()]);
  return (
    <div className="pb-20">
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 -z-10 bg-gradient-to-b from-secondary/80 to-background" aria-hidden />
        <div className="container-page grid gap-10 py-14 lg:grid-cols-[1.1fr_0.9fr] lg:items-center lg:py-20">
          <div className="space-y-6">
            <p className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-card px-3 py-1 text-sm font-semibold text-primary"><ShieldCheck className="size-4" aria-hidden /> פלטפורמה למכירת רכבים מידיים פרטיות בלבד</p>
            <h1 className="text-display font-extrabold text-brand-dark">{siteConfig.tagline}</h1>
            <p className="max-w-xl text-lg leading-relaxed text-muted-foreground">{siteConfig.description}</p>
            <div className="flex flex-wrap gap-3">
              <Link href="/sell" className={buttonVariants({ size: "lg", variant: "accent" })}><CirclePlus aria-hidden /> פרסום רכב</Link>
              <Link href="/vehicle-check" className={buttonVariants({ size: "lg", variant: "outline" })}><FileSearch aria-hidden /> בדיקת רכב לפי מספר רישוי</Link>
            </div>
          </div>
          <div className="relative mx-auto hidden aspect-square w-full max-w-sm items-center justify-center lg:flex" aria-hidden>
            <div className="absolute inset-6 rounded-full bg-primary/5" />
            <div className="absolute inset-16 rounded-full bg-primary/10" />
            <LogoSymbol className="size-40 drop-shadow-xl" />
          </div>
        </div>
        <div className="container-page -mt-4 pb-10">
          <HeroSearch makes={makes} models={models} districts={geo.districts} />
        </div>
      </section>

      {/* Recent listings */}
      <section className="container-page space-y-5 py-10" aria-labelledby="recent-heading">
        <div className="flex items-end justify-between gap-4">
          <div><h2 id="recent-heading" className="text-h2 font-extrabold">פורסמו לאחרונה</h2><p className="text-muted-foreground">מודעות שאושרו ועלו ללוח ממש עכשיו</p></div>
          <Link href="/cars" className="inline-flex items-center gap-1 text-sm font-semibold text-primary underline-offset-4 hover:underline">לכל הרכבים <ArrowLeft className="size-4" aria-hidden /></Link>
        </div>
        {recent.length === 0 ? (
          <EmptyState icon={<Car />} title="הלוח חדש וממתין למוכרים הפרטיים הראשונים" description="בינתיים אפשר לבדוק רכב לפי מספר רישוי, לשמור חיפוש ולקבל התראה כשיתפרסם רכב מתאים, או לפרסם את הרכב שלכם." action={<><Link href="/sell" className={buttonVariants({ variant: "accent" })}>פרסום רכב</Link><Link href="/cars" className={buttonVariants({ variant: "outline" })}>שמירת חיפוש</Link></>} />
        ) : (
          <Suspense><ListingGrid listings={recent} /></Suspense>
        )}
      </section>

      {/* Popular makes & categories */}
      <section className="container-page grid gap-10 py-10 lg:grid-cols-2" aria-label="חיפוש מהיר לפי יצרן וקטגוריה">
        <div className="space-y-4">
          <h2 className="text-h2 font-extrabold">יצרנים פופולריים</h2>
          <ul className="grid grid-cols-3 gap-2 sm:grid-cols-4">
            {popular.map((m) => <li key={m.id}><Link href={`/cars?make=${m.id}`} className="block rounded-md border border-border bg-card px-3 py-3 text-center text-sm font-semibold transition-colors hover:border-primary hover:text-primary focus-visible:outline-2 focus-visible:outline-ring">{m.name_he}</Link></li>)}
          </ul>
        </div>
        <div className="space-y-4">
          <h2 className="text-h2 font-extrabold">לפי סוג רכב</h2>
          <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {categories.map((c) => <li key={c.key}><Link href={`/cars?category=${c.key}`} className="flex items-center gap-2 rounded-md border border-border bg-card px-3 py-3 text-sm font-semibold transition-colors hover:border-primary hover:text-primary focus-visible:outline-2 focus-visible:outline-ring"><c.icon className="size-4 text-primary" aria-hidden />{categoryLabels[c.key]}</Link></li>)}
          </ul>
        </div>
      </section>

      {/* How it works */}
      <section className="bg-brand-dark py-16 text-white" aria-labelledby="how-heading">
        <div className="container-page space-y-10">
          <div className="max-w-2xl"><h2 id="how-heading" className="text-h2 font-extrabold">איך זה עובד</h2><p className="mt-2 text-white/75">תהליך קצר שנבנה סביב אמון: לקונים ולמוכרים.</p></div>
          <div className="grid gap-6 md:grid-cols-2">
            <div className="rounded-xl bg-white/5 p-6">
              <h3 className="mb-4 flex items-center gap-2 text-lg font-bold"><Search className="size-5 text-brand-amber" aria-hidden /> קונים</h3>
              <ol className="space-y-3 text-sm text-white/85">
                <li className="flex gap-3"><span className="num font-bold text-brand-amber">1</span> מחפשים לפי יצרן, דגם, מחיר, שנה, ק״מ ומיקום. כל התוצאות ממוכרים פרטיים.</li>
                <li className="flex gap-3"><span className="num font-bold text-brand-amber">2</span> רואים נתונים רשמיים זמינים לצד הצהרות המוכר – בנפרד ובשקיפות.</li>
                <li className="flex gap-3"><span className="num font-bold text-brand-amber">3</span> משווים למחירי פרסום של רכבים דומים, שומרים ומשווים עד 3 רכבים.</li>
                <li className="flex gap-3"><span className="num font-bold text-brand-amber">4</span> מתחברים עם טלפון ומדברים ישירות עם המוכר – בטלפון או ב-WhatsApp.</li>
              </ol>
            </div>
            <div className="rounded-xl bg-white/5 p-6">
              <h3 className="mb-4 flex items-center gap-2 text-lg font-bold"><Handshake className="size-5 text-brand-amber" aria-hidden /> מוכרים</h3>
              <ol className="space-y-3 text-sm text-white/85">
                <li className="flex gap-3"><span className="num font-bold text-brand-amber">1</span> מזינים מספר רישוי – אנחנו שולפים את פרטי הרכב מהמקורות הרשמיים.</li>
                <li className="flex gap-3"><span className="num font-bold text-brand-amber">2</span> משלימים מחיר, קילומטראז׳, מצב ותמונות (3–15).</li>
                <li className="flex gap-3"><span className="num font-bold text-brand-amber">3</span> חותמים על הצהרת מוכר פרטי. בלי זה אין פרסום.</li>
                <li className="flex gap-3"><span className="num font-bold text-brand-amber">4</span> המודעה נבדקת על ידי אדם ועולה לאוויר. הטלפון נחשף רק לקונים מחוברים.</li>
              </ol>
            </div>
          </div>
          <Link href="/how-it-works" className={buttonVariants({ variant: "outline", className: "border-white/30 bg-transparent text-white hover:bg-white/10" })}>לפרטים המלאים</Link>
        </div>
      </section>

      {/* Why private only */}
      <section className="container-page py-16" aria-labelledby="why-heading">
        <div className="mx-auto max-w-3xl text-center"><h2 id="why-heading" className="text-h2 font-extrabold">למה רק פרטי?</h2><p className="mt-3 text-muted-foreground leading-relaxed">בלוחות רגילים קשה לדעת מי עומד מאחורי המודעה. כשכל המוכרים פרטיים – השיחה אחרת: בלי "אני אתקשר עם המנהל", בלי מלאי מתחלף ובלי מודעות שמוסוות כפרטיות.</p></div>
        <ul className="mt-10 grid gap-5 md:grid-cols-3">
          {[
            { icon: Ban, title: "אפס סוחרים", text: "אין חשבונות עסקיים, אין עמודי מגרש, אין מנויים לסוחרים. אין דרך צדדית." },
            { icon: Eye, title: "בקרה אנושית", text: "כל מודעה נבדקת לפני פרסום. דפוסים חשודים מסומנים אוטומטית ונבדקים על ידי צוות." },
            { icon: Phone, title: "פרטיות למוכרים", text: "מספר הטלפון נחשף רק למשתמשים מחוברים ולאחר לחיצה מכוונת. כל חשיפה מתועדת." },
          ].map((f) => <li key={f.title}><Card className="h-full"><CardContent className="pt-6"><f.icon className="size-7 text-primary" aria-hidden /><h3 className="mt-3 text-lg font-bold">{f.title}</h3><p className="mt-1 text-sm leading-relaxed text-muted-foreground">{f.text}</p></CardContent></Card></li>)}
        </ul>
      </section>

      {/* Vehicle check + valuation */}
      <section className="container-page grid gap-6 py-6 lg:grid-cols-2" aria-label="כלים לקונים">
        <Card className="overflow-hidden">
          <CardContent className="space-y-4 pt-6">
            <div className="flex items-center gap-2 text-primary"><FileSearch className="size-6" aria-hidden /><h2 className="text-h3 font-bold">בדיקת רכב לפי מספר רישוי</h2></div>
            <p className="text-sm text-muted-foreground leading-relaxed">לפני שמתקשרים: זיהוי הרכב, תוקף רישוי, נסועה שנרשמה בטסטים, היסטוריית סוג בעלות וקריאות שירות – ממקורות ציבוריים, עם ציון מקור ותאריך. מה שלא נמצא, נכתב במפורש.</p>
            <LookupForm compact />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="space-y-4 pt-6">
            <div className="flex items-center gap-2 text-primary"><Scale className="size-6" aria-hidden /><h2 className="text-h3 font-bold">הערכת שווי כנה</h2></div>
            <p className="text-sm text-muted-foreground leading-relaxed">אנחנו מראים טווח של <strong>מחירי פרסום של מודעות דומות</strong> – ורק כשיש מספיק נתונים. בלי מספרים מומצאים ובלי להציג מחיר מבוקש כמחיר עסקה. ספקי הערכה מסחריים יחוברו רק עם הרשאה מסודרת.</p>
            <Link href="/valuation" className={buttonVariants({ variant: "outline" })}>לבדיקת טווח מחיר <ArrowLeft aria-hidden /></Link>
          </CardContent>
        </Card>
      </section>

      {/* Trust */}
      <section className="container-page py-16" aria-labelledby="trust-heading">
        <div className="rounded-2xl border border-border bg-card p-8 shadow-card lg:p-12">
          <div className="grid gap-8 lg:grid-cols-[1fr_1.2fr] lg:items-center">
            <div><h2 id="trust-heading" className="text-h2 font-extrabold">מה אנחנו כן מבטיחים – ומה לא</h2><p className="mt-3 text-muted-foreground leading-relaxed">אמון נבנה משקיפות. לכן אנחנו מסמנים בדיוק מה אומת, מה הוצהר ומה לא ידוע.</p></div>
            <ul className="grid gap-3 sm:grid-cols-2">
              {[
                { ok: true, icon: Phone, t: "״טלפון מאומת״ – המוכר אימת מספר נייד ישראלי בקוד SMS." },
                { ok: true, icon: ShieldCheck, t: "״הצהרת מוכר פרטי״ – המוכר הצהיר, בגרסה מתועדת, שהוא לא סוחר." },
                { ok: true, icon: Database, t: "נתונים רשמיים מוצגים עם מקור ותאריך, בנפרד מהצהרות המוכר." },
                { ok: false, icon: Ban, t: "אנחנו לא מציגים ״בעלות מאומתת״ – אין לנו דרך לאמת בעלות, אז לא נטען זאת." },
              ].map((x, i) => <li key={i} className={`flex gap-3 rounded-md p-3 text-sm ${x.ok ? "bg-success-soft" : "bg-secondary"}`}><x.icon className={`size-5 shrink-0 ${x.ok ? "text-success" : "text-muted-foreground"}`} aria-hidden /><span>{x.t}</span></li>)}
            </ul>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="container-page max-w-3xl py-10" aria-labelledby="faq-heading">
        <h2 id="faq-heading" className="text-h2 font-extrabold">שאלות נפוצות</h2>
        <Accordion type="single" collapsible className="mt-4">
          {faq.map((f, i) => <AccordionItem key={i} value={`f${i}`}><AccordionTrigger>{f.q}</AccordionTrigger><AccordionContent>{f.a}</AccordionContent></AccordionItem>)}
        </Accordion>
        <Link href="/faq" className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-primary underline-offset-4 hover:underline">לכל השאלות <ArrowLeft className="size-4" aria-hidden /></Link>
      </section>
    </div>
  );
}
