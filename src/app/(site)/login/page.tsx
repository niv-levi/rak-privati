import type { Metadata } from "next";
import { ShieldCheck, Smartphone, UserCheck } from "lucide-react";
import { Logo } from "@/components/brand/logo";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { PhoneLoginForm } from "@/features/auth/components/phone-login-form";
import { isSupabaseConfigured } from "@/lib/supabase/env";

export const metadata: Metadata = { title: "כניסה", robots: { index: false } };

export default async function LoginPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sp = await searchParams;
  const next = typeof sp.next === "string" ? sp.next : undefined;
  const configured = isSupabaseConfigured();
  const smsConfigured = process.env.AUTH_SMS_CONFIGURED === "true";

  return (
    <div className="container-page py-10 sm:py-16">
      <div className="mx-auto grid max-w-4xl gap-10 lg:grid-cols-[1fr_1fr] lg:items-start">
        <div className="space-y-6">
          <Logo size="lg" />
          <h1 className="text-h1 font-extrabold">כניסה עם מספר טלפון</h1>
          <p className="text-muted-foreground leading-relaxed">
            ברק פרטי אין סיסמאות. מתחברים עם מספר הנייד, מקבלים קוד ב-SMS, ונכנסים. אותו חשבון משמש גם לקנייה וגם למכירה.
          </p>
          <ul className="space-y-3 text-sm">
            <li className="flex gap-3"><Smartphone className="size-5 shrink-0 text-primary" aria-hidden /> <span>אימות טלפון מקשה על יצירת חשבונות מזויפים ומאפשר לנו לאכוף את כלל &quot;מוכרים פרטיים בלבד&quot;.</span></li>
            <li className="flex gap-3"><ShieldCheck className="size-5 shrink-0 text-primary" aria-hidden /> <span>מספר הטלפון שלך לא מוצג באף מקום בלי אישורך המפורש.</span></li>
            <li className="flex gap-3"><UserCheck className="size-5 shrink-0 text-primary" aria-hidden /> <span>אימות טלפון אינו אימות בעלות על רכב או אימות זהות – אנחנו מציגים זאת בשקיפות גם לקונים.</span></li>
          </ul>
        </div>
        <Card>
          <CardHeader>
            <CardTitle as="h2">מספר הטלפון שלך</CardTitle>
            <CardDescription>תומך בפורמט 05X וגם ‎+972</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {!configured && (
              <Alert variant="warning">
                <AlertTitle>ההתחברות עדיין לא פעילה בסביבה זו</AlertTitle>
                <AlertDescription>חיבור ל-Supabase טרם הוגדר. לאחר הגדרת משתני הסביבה הטופס יפעל אוטומטית.</AlertDescription>
              </Alert>
            )}
            {configured && !smsConfigured && (
              <Alert variant="info">
                <AlertTitle>ספק ה-SMS טרם חובר</AlertTitle>
                <AlertDescription>בסביבת פיתוח ניתן להשתמש במספרי בדיקה שהוגדרו ב-Supabase (Auth → Phone → Test OTPs). ראו docs/DEPLOYMENT.md.</AlertDescription>
              </Alert>
            )}
            <PhoneLoginForm next={next} disabled={!configured} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
