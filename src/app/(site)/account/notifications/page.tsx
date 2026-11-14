import { Bell } from "lucide-react";
import { requireUser, getProfile } from "@/lib/auth/guards";
import { PageHeader } from "@/components/layout/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { NotificationList } from "@/features/account/components/notification-list";
import { NotificationPrefsForm } from "@/features/account/components/notification-prefs-form";

export const metadata = { title: "התראות", robots: { index: false } };

export default async function NotificationsPage() {
  const { user, supabase } = await requireUser("/account/notifications");
  const profile = await getProfile();
  const { data } = await supabase.from("notifications").select("id, type, title, body, href, read_at, created_at").eq("user_id", user.id).order("created_at", { ascending: false }).limit(100);
  const prefs = (profile?.notification_prefs ?? {}) as Record<string, boolean>;
  return (
    <div className="space-y-8">
      <PageHeader title="התראות" className="py-0" />
      {(data ?? []).length === 0 ? (
        <EmptyState icon={<Bell />} title="אין התראות" description="כאן יופיעו עדכונים על המודעות שלכם, ירידות מחיר ברכבים שמורים ורכבים חדשים שמתאימים לחיפושים שמורים." />
      ) : (
        <NotificationList items={data ?? []} />
      )}
      <section aria-labelledby="prefs" className="space-y-3">
        <h2 id="prefs" className="text-h3 font-bold">העדפות התראות</h2>
        <NotificationPrefsForm initial={{ in_app: prefs.in_app ?? true, email: prefs.email ?? false, sms_important: prefs.sms_important ?? true, saved_search: prefs.saved_search ?? true, marketing: !!profile?.marketing_consent_at }} emailConfigured={!!process.env.EMAIL_PROVIDER} />
      </section>
    </div>
  );
}
