import Link from "next/link";
import { FileSearch } from "lucide-react";
import { requireUser } from "@/lib/auth/guards";
import { PageHeader } from "@/components/layout/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { buttonVariants } from "@/components/ui/button";
import { SavedReportRow } from "@/features/account/components/saved-report-row";
import type { VehicleReport } from "@/lib/providers/types";

export const metadata = { title: "דוחות רכב שמורים", robots: { index: false } };

export default async function SavedReportsPage() {
  const { user, supabase } = await requireUser("/account/vehicle-checks");
  const { data } = await supabase.from("saved_vehicle_reports").select("id, title, created_at, lookup_result_id, vehicle_lookup_results!inner(id, report, fetched_at, plate_number)").eq("user_id", user.id).order("created_at", { ascending: false });
  const rows = (data ?? []).map((r) => {
    const res = r.vehicle_lookup_results as unknown as { id: string; report: VehicleReport; fetched_at: string; plate_number: string };
    return { id: r.id, resultId: res.id, title: r.title, createdAt: r.created_at, fetchedAt: res.fetched_at, plate: res.plate_number, status: res.report.overallStatus, summary: [res.report.identification.make.value, res.report.identification.commercialName.value ?? res.report.identification.model.value, res.report.identification.year.value].filter(Boolean).join(" ") };
  });
  return (
    <div className="space-y-6">
      <PageHeader title="דוחות רכב שמורים" description="הדוחות מוצגים רק לכם. מספר הרישוי המלא אינו נחשף לאיש." className="py-0" actions={<Link href="/vehicle-check" className={buttonVariants({ variant: "outline" })}>בדיקה חדשה</Link>} />
      {rows.length === 0 ? (
        <EmptyState icon={<FileSearch />} title="אין דוחות שמורים" description="בצעו בדיקת רכב לפי מספר רישוי ושמרו את הדוח כדי לחזור אליו." action={<Link href="/vehicle-check" className={buttonVariants()}>לבדיקת רכב</Link>} />
      ) : (
        <ul className="space-y-3">{rows.map((r) => <li key={r.id}><SavedReportRow row={r} /></li>)}</ul>
      )}
    </div>
  );
}
