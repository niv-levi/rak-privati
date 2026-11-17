import type { Metadata } from "next";
import { LegalPage } from "@/components/content/legal-page";

export const metadata: Metadata = { title: "מדיניות עוגיות", description: "אילו עוגיות ואחסון מקומי רק פרטי משתמשת בהם ולמה.", alternates: { canonical: "/cookies" } };

export default function CookiesPage() {
  return (
    <LegalPage title="מדיניות עוגיות ואחסון מקומי" version="2026-11-draft-1" updatedAt="2026-11-12"
      sections={[
        { id: "what", title: "מה אנחנו שומרים בדפדפן", body: <table className="w-full text-sm"><thead><tr className="text-start"><th scope="col" className="py-1 text-start">שם / סוג</th><th scope="col" className="py-1 text-start">מטרה</th><th scope="col" className="py-1 text-start">משך</th><th scope="col" className="py-1 text-start">חובה?</th></tr></thead><tbody className="[&_td]:py-1.5 [&_tr]:border-t [&_tr]:border-border"><tr><td dir="ltr">sb-*-auth-token</td><td>שמירת ההתחברות שלכם (Supabase Auth)</td><td>עד יציאה / פקיעה</td><td>כן</td></tr><tr><td dir="ltr">rp_pending_login</td><td>זיכרון זמני של בקשת קוד אימות</td><td>10 דקות</td><td>כן</td></tr><tr><td dir="ltr">localStorage: rp:compare</td><td>רשימת הרכבים להשוואה</td><td>עד מחיקה</td><td>לא (נוחות)</td></tr><tr><td dir="ltr">Service Worker cache</td><td>טעינה מהירה ועבודה בסיסית ללא רשת (רק דפים ציבוריים ונכסים)</td><td>עד עדכון</td><td>לא</td></tr></tbody></table> },
        { id: "no-tracking", title: "מה אנחנו לא עושים", body: <ul><li>אין עוגיות פרסום או מעקב בין אתרים.</li><li>אין שיתוף נתוני גלישה עם רשתות פרסום.</li><li>אנליטיקה פנימית נשמרת בצד השרת באופן אנונימי, ללא עוגיית זיהוי.</li></ul> },
        { id: "control", title: "שליטה", body: <p>ניתן למחוק עוגיות ואחסון מקומי דרך הגדרות הדפדפן. מחיקת עוגיית ההתחברות תנתק אתכם מהחשבון. אם בעתיד נוסיף כלים שאינם חיוניים, נבקש הסכמה מראש.</p> },
      ]} />
  );
}
