import type { Metadata } from "next";
import Link from "next/link";
import { Search, CirclePlus, FileSearch, ShieldCheck, Bell, UserRound, Accessibility, LifeBuoy } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent } from "@/components/ui/card";

export const metadata: Metadata = { title: "מרכז העזרה", description: "מדריכים קצרים לקונים ולמוכרים ברק פרטי.", alternates: { canonical: "/help" } };

const topics = [
  { icon: Search, t: "חיפוש וסינון", d: "איך משתמשים במסננים, בחיפוש לפי רדיוס ובשמירת חיפוש.", href: "/cars", steps: ["בחרו יצרן ודגם או הקלידו חיפוש חופשי.", "הגבילו מחיר, שנה וקילומטראז׳.", "בחרו עיר אחת כדי לאפשר חיפוש לפי רדיוס.", "לחצו \"שמירת חיפוש\" כדי לקבל התראה על רכבים חדשים."] },
  { icon: CirclePlus, t: "פרסום רכב", d: "תהליך הפרסום צעד אחר צעד, כולל תמונות והצהרה.", href: "/sell", steps: ["התחברו עם מספר טלפון.", "הזינו מספר רישוי ואשרו את הנתונים הרשמיים.", "השלימו פרטים, מחיר, מצב ותמונות (3–15).", "אשרו את הצהרת המוכר הפרטי ושלחו לבדיקה."] },
  { icon: FileSearch, t: "בדיקת רכב", d: "איך לקרוא את הדוח ומה המגבלות שלו.", href: "/vehicle-check", steps: ["הזינו 7–8 ספרות.", "בדקו את סימני האזהרה וסטטוס כל מקור.", "זכרו: נסועה בטסט אינה נסועה נוכחית; היעדר רשומה אינו הוכחה.", "שמרו את הדוח בחשבון כדי לחזור אליו."] },
  { icon: ShieldCheck, t: "מוכרים פרטיים בלבד", d: "מי רשאי לפרסם, איך מדווחים על סוחר ואיך מערערים.", href: "/private-seller-policy", steps: ["כל מודעה נבדקת על ידי אדם.", "בכפתור \"דיווח\" בכל מודעה אפשר לסמן חשד לסוחר.", "ערעור מוגש מעמוד המודעות שלי."] },
  { icon: Bell, t: "התראות", d: "אילו התראות קיימות ואיך שולטים בהן.", href: "/account/notifications", steps: ["התראות תפעוליות (אישור, פנייה, ירידת מחיר) פעילות כברירת מחדל.", "דיוור שיווקי דורש הסכמה נפרדת.", "ניתן לכבות התראות לחיפושים שמורים לכל חיפוש בנפרד."] },
  { icon: UserRound, t: "חשבון ואבטחה", d: "התחברות, החלפת מספר, ניתוק מכשירים ומחיקת חשבון.", href: "/account/security", steps: ["ההתחברות בקוד SMS חד-פעמי, ללא סיסמה.", "לעולם לא נבקש קוד אימות בטלפון.", "ניתוק מכל המכשירים זמין בעמוד האבטחה."] },
  { icon: Accessibility, t: "נגישות", d: "התאמות קיימות, מגבלות ידועות ודרכי פנייה.", href: "/accessibility", steps: ["ניווט מלא במקלדת ותמיכה בקוראי מסך.", "הגדלה עד 200% ללא אובדן תוכן.", "פנייה לרכז/ת הנגישות דרך טופס יצירת הקשר."] },
];

export default function HelpPage() {
  return (
    <div className="container-page pb-16">
      <PageHeader title="מרכז העזרה" description="מדריכים קצרים. לא מצאתם תשובה? פנו אלינו." actions={<Link href="/contact" className="inline-flex items-center gap-2 rounded-md border border-border bg-card px-4 py-2 text-sm font-semibold hover:bg-secondary"><LifeBuoy className="size-4" aria-hidden /> יצירת קשר</Link>} />
      <ul className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        {topics.map((t) => (
          <li key={t.t}><Card className="h-full"><CardContent className="pt-6"><t.icon className="size-6 text-primary" aria-hidden /><h2 className="mt-2 text-lg font-bold">{t.t}</h2><p className="text-sm text-muted-foreground">{t.d}</p><ol className="mt-3 list-decimal space-y-1 ps-5 text-sm">{t.steps.map((s) => <li key={s}>{s}</li>)}</ol><Link href={t.href} className="mt-3 inline-block text-sm font-semibold text-primary underline-offset-4 hover:underline">מעבר</Link></CardContent></Card></li>
        ))}
      </ul>
    </div>
  );
}
