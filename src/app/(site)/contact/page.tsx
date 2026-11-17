import type { Metadata } from "next";
import { Mail, Clock, ShieldAlert, Accessibility } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { ContactForm } from "@/features/contact/contact-form";
import { siteConfig } from "@/lib/config/site";
import { isSupabaseConfigured } from "@/lib/supabase/env";

export const metadata: Metadata = { title: "יצירת קשר", description: "פנייה לצוות רק פרטי: תמיכה, דיווח על סוחר, נגישות ופרטיות.", alternates: { canonical: "/contact" } };

export default async function ContactPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sp = await searchParams;
  const topic = typeof sp.topic === "string" ? sp.topic : undefined;
  return (
    <div className="container-page pb-16">
      <PageHeader title="יצירת קשר" description="נשמח לעזור. אנחנו עונים לפניות בתוך 2 ימי עסקים, ולפניות נגישות ופרטיות בתוך 5 ימי עסקים לכל היותר." />
      <div className="grid gap-8 lg:grid-cols-[1fr_320px]">
        <Card><CardContent className="pt-6"><ContactForm initialTopic={topic} disabled={!isSupabaseConfigured()} /></CardContent></Card>
        <aside className="space-y-4 text-sm">
          <Card><CardContent className="space-y-3 pt-6">
            <p className="flex items-center gap-2 font-bold"><Mail className="size-4 text-primary" aria-hidden /> דוא״ל</p>
            <p className="text-muted-foreground" dir="ltr">{siteConfig.supportEmail || "יפורסם בקרוב"}</p>
            <p className="flex items-center gap-2 font-bold"><Clock className="size-4 text-primary" aria-hidden /> שעות מענה</p>
            <p className="text-muted-foreground">ימים א׳–ה׳, 9:00–17:00</p>
          </CardContent></Card>
          <Card><CardContent className="space-y-2 pt-6"><p className="flex items-center gap-2 font-bold"><ShieldAlert className="size-4 text-destructive" aria-hidden /> דיווח על סוחר</p><p className="text-muted-foreground">הדרך המהירה ביותר: כפתור "דיווח" במודעה עצמה. הדיווח מגיע ישירות לצוות הבקרה.</p></CardContent></Card>
          <Card><CardContent className="space-y-2 pt-6"><p className="flex items-center gap-2 font-bold"><Accessibility className="size-4 text-primary" aria-hidden /> נגישות</p><p className="text-muted-foreground">בחרו בנושא "נגישות". {siteConfig.accessibility.email ? <>או כתבו ל-<span dir="ltr">{siteConfig.accessibility.email}</span></> : "פרטי רכז/ת הנגישות יפורסמו בהצהרת הנגישות."}</p></CardContent></Card>
        </aside>
      </div>
    </div>
  );
}
