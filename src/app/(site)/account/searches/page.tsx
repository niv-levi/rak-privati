import Link from "next/link";
import { Bookmark } from "lucide-react";
import { requireUser } from "@/lib/auth/guards";
import { PageHeader } from "@/components/layout/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { buttonVariants } from "@/components/ui/button";
import { SavedSearchRow } from "@/features/account/components/saved-search-row";

export const metadata = { title: "חיפושים שמורים", robots: { index: false } };

export default async function SavedSearchesPage() {
  const { user, supabase } = await requireUser("/account/searches");
  const { data } = await supabase.from("saved_searches").select("id, name, query_string, notify, created_at, last_notified_at").eq("user_id", user.id).order("created_at", { ascending: false });
  return (
    <div className="space-y-6">
      <PageHeader title="חיפושים שמורים" description="נודיע לכם כשמודעה חדשה שמתאימה לחיפוש תאושר ותעלה ללוח." className="py-0" />
      {(data ?? []).length === 0 ? (
        <EmptyState icon={<Bookmark />} title="אין חיפושים שמורים" description="בצעו חיפוש עם המסננים שמעניינים אתכם ולחצו על ״שמירת חיפוש״." action={<Link href="/cars" className={buttonVariants()}>לחיפוש רכב</Link>} />
      ) : (
        <ul className="space-y-3">{(data ?? []).map((s) => <li key={s.id}><SavedSearchRow search={s} /></li>)}</ul>
      )}
    </div>
  );
}
