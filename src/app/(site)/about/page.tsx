import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { LogoSymbol } from "@/components/brand/logo";
import { buttonVariants } from "@/components/ui/button";

export const metadata: Metadata = { title: "אודות", description: "למה הקמנו את רק פרטי – לוח רכבים שמיועד לאנשים פרטיים בלבד.", alternates: { canonical: "/about" } };

export default function AboutPage() {
  return (
    <div className="container-page pb-16">
      <PageHeader eyebrow="אודות" title="לוח רכבים שנבנה סביב שאלה אחת: מי באמת מוכר?" description="בלוחות הקיימים קשה לדעת אם מאחורי המודעה עומד אדם שמוכר את הרכב שלו או מגרש עם מלאי מתחלף. רק פרטי נולד כדי להחזיר את הביטחון לעסקה בין אנשים." />
      <div className="grid gap-8 lg:grid-cols-[1fr_320px]">
        <div className="space-y-6 text-[15px] leading-relaxed">
          <section className="space-y-3"><h2 className="text-h3 font-bold">המחויבות שלנו</h2><p>אנחנו מחויבים לשלושה דברים: <strong>מוכרים פרטיים בלבד</strong>, <strong>שקיפות בנתונים</strong> ו<strong>כבוד לפרטיות</strong>. אין אצלנו מסלול עסקי, אין עמודי סוחרים ואין פשרות על זה – גם כשזה אומר פחות מודעות.</p></section>
          <section className="space-y-3"><h2 className="text-h3 font-bold">מה אנחנו לא</h2><p>אנחנו לא סוחרים, לא מתווכים ולא מכון בדיקה. אנחנו לא מבטיחים שרכב תקין, לא טוענים שאימתנו בעלות ולא ממציאים הערכות שווי. כשמידע חסר – אנחנו אומרים את זה.</p></section>
          <section className="space-y-3"><h2 className="text-h3 font-bold">איפה אנחנו היום</h2><p>הפלטפורמה בתקופת השקה. החיפוש, הפרסום, בדיקת הרכב וההשוואה פועלים. חיבור מלא למאגרי משרד התחבורה ולספקי היסטוריה מסחריים מתבצע בהדרגה, ומצב כל מקור מוצג בשקיפות בעמוד <Link href="/data-sources" className="underline underline-offset-4">מקורות המידע</Link>. איננו מציגים נתוני שימוש או המלצות משתמשים מומצאים.</p></section>
          <section className="space-y-3"><h2 className="text-h3 font-bold">נגישות ופרטיות כברירת מחדל</h2><p>האתר תוכנן לעמוד ב-WCAG 2.2 AA ובדרישות הנגישות הישראליות, ומיישם הגנה על מידע אישי ברמת מסד הנתונים. ראו <Link href="/accessibility" className="underline underline-offset-4">הצהרת הנגישות</Link> ו<Link href="/privacy" className="underline underline-offset-4">מדיניות הפרטיות</Link>.</p></section>
        </div>
        <aside>
          <Card><CardContent className="flex flex-col items-center gap-4 pt-6 text-center"><LogoSymbol className="size-20" /><p className="text-xl font-extrabold">רק פרטי</p><p className="text-sm text-muted-foreground">רכב קונים מאנשים. לא מסוחרים.</p><Link href="/contact" className={buttonVariants({ variant: "outline" })}>יצירת קשר</Link></CardContent></Card>
        </aside>
      </div>
    </div>
  );
}
