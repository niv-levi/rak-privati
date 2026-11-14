import { requireUser, getProfile } from "@/lib/auth/guards";
import { AccountNav } from "@/features/account/components/account-nav";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { accountStatusLabels } from "@/lib/labels";

export default async function AccountLayout({ children }: { children: React.ReactNode }) {
  await requireUser("/account");
  const profile = await getProfile();
  return (
    <div className="container-page grid gap-8 py-8 lg:grid-cols-[240px_1fr]">
      <AccountNav displayName={profile?.display_name ?? null} />
      <div className="min-w-0 space-y-6">
        {profile && !["active"].includes(profile.account_status) && (
          <Alert variant={profile.account_status === "warned" ? "warning" : "destructive"}>
            <AlertTitle>מצב החשבון: {accountStatusLabels[profile.account_status]}</AlertTitle>
            <AlertDescription>{profile.status_reason ? `סיבה: ${profile.status_reason}. ` : ""}{profile.account_status === "warned" ? "ניתן להמשיך להשתמש בחשבון. הפרה נוספת עלולה להוביל להשעיה." : "לא ניתן לפרסם מודעות חדשות. ניתן להגיש ערעור דרך עמוד המודעות."}</AlertDescription>
          </Alert>
        )}
        {children}
      </div>
    </div>
  );
}
