import { ShieldCheck, Smartphone, KeyRound, History } from "lucide-react";
import { requireUser, getProfile } from "@/lib/auth/guards";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { formatIsraeliPhone, formatDateTime } from "@/lib/format";
import { SignOutEverywhereButton } from "@/features/account/components/sign-out-everywhere";

export const metadata = { title: "אבטחת החשבון", robots: { index: false } };

export default async function SecurityPage() {
  const { user, supabase } = await requireUser("/account/security");
  const profile = await getProfile();
  const { data: contactEvents } = await supabase.from("contact_events").select("id, channel, created_at, listing_id, listings!inner(make_name, model_name)").eq("requester_id", user.id).order("created_at", { ascending: false }).limit(10);
  return (
    <div className="space-y-6">
      <PageHeader title="אבטחת החשבון" className="py-0" />
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><Smartphone className="size-5 text-primary" aria-hidden /> שיטת ההתחברות</CardTitle><CardDescription>ההתחברות מתבצעת בקוד חד-פעמי ב-SMS. אין סיסמה שאפשר לגנוב.</CardDescription></CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p>מספר מאומת: <span className="num font-semibold">{formatIsraeliPhone(profile?.phone_e164)}</span></p>
            <p className="text-muted-foreground">להחלפת מספר הטלפון יש לפנות לתמיכה (נדרש אימות של המספר הישן והחדש). ההחלפה תתועד כאירוע אבטחה.</p>
            <p className="text-muted-foreground">כניסה אחרונה: <span className="num">{formatDateTime(user.last_sign_in_at)}</span></p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><KeyRound className="size-5 text-primary" aria-hidden /> הפעלות</CardTitle><CardDescription>אם התחברתם ממכשיר שאינו שלכם – נתקו את כל ההפעלות.</CardDescription></CardHeader>
          <CardContent><SignOutEverywhereButton /></CardContent>
        </Card>
        <Card className="lg:col-span-2">
          <CardHeader><CardTitle className="flex items-center gap-2"><History className="size-5 text-primary" aria-hidden /> פרטי קשר שחשפתם לאחרונה</CardTitle><CardDescription>לשקיפות: אלה המודעות שבהן ביקשתם לראות את מספר הטלפון של המוכר.</CardDescription></CardHeader>
          <CardContent>
            {(contactEvents ?? []).length === 0 ? <p className="text-sm text-muted-foreground">עדיין לא חשפתם פרטי קשר.</p> : (
              <ul className="divide-y divide-border text-sm">
                {(contactEvents ?? []).map((e) => { const l = e.listings as unknown as { make_name: string | null; model_name: string | null }; return <li key={e.id} className="flex justify-between py-2"><span>{l.make_name} {l.model_name} · {e.channel === "phone" ? "טלפון" : "WhatsApp"}</span><span className="num text-muted-foreground">{formatDateTime(e.created_at)}</span></li>; })}
              </ul>
            )}
          </CardContent>
        </Card>
        <p className="flex items-start gap-2 text-xs text-muted-foreground lg:col-span-2"><ShieldCheck className="size-4 shrink-0 text-success" aria-hidden /> אנחנו לעולם לא נבקש מכם קוד אימות בטלפון או בהודעה. מי שמבקש – מתחזה.</p>
      </div>
    </div>
  );
}
