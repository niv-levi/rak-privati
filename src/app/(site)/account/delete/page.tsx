import { AlertTriangle } from "lucide-react";
import { requireUser } from "@/lib/auth/guards";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { DeleteAccountForm } from "@/features/account/components/delete-account-form";

export const metadata = { title: "מחיקת חשבון", robots: { index: false } };

export default async function DeleteAccountPage() {
  const { user, supabase } = await requireUser("/account/delete");
  const { count } = await supabase.from("listings").select("id", { count: "exact", head: true }).eq("seller_id", user.id).in("status", ["active", "pending_review", "paused"]);
  return (
    <div className="space-y-6">
      <PageHeader title="מחיקת החשבון" className="py-0" />
      <Card className="max-w-2xl">
        <CardHeader><CardTitle className="flex items-center gap-2"><AlertTriangle className="size-5 text-destructive" aria-hidden /> מה קורה במחיקה</CardTitle><CardDescription>הפעולה אינה הפיכה. ניתן לפתוח חשבון חדש עם אותו מספר טלפון בעתיד.</CardDescription></CardHeader>
        <CardContent className="space-y-4 text-sm">
          <ul className="list-disc space-y-1 ps-5">
            <li>{count ? <>המודעות הפעילות שלכם (<span className="num">{count}</span>) יוסרו מיד.</> : "אין לכם מודעות פעילות."}</li>
            <li>רכבים שמורים, חיפושים שמורים, דוחות רכב והתראות יימחקו.</li>
            <li>השם, העיר וההעדפות יימחקו; מספר הטלפון יוסר ממערכת ההתחברות.</li>
            <li>רשומות הסכמה, יומני בקרה ואירועי חשיפת פרטי קשר נשמרים בצורה מצומצמת לפרק הזמן הנדרש בדין (ראו <a href="/privacy" className="underline underline-offset-4">מדיניות הפרטיות</a>).</li>
          </ul>
          <DeleteAccountForm />
        </CardContent>
      </Card>
    </div>
  );
}
