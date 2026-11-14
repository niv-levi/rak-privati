import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { requireUser } from "@/lib/auth/guards";
import { VehicleReportView } from "@/features/vehicle-check/components/vehicle-report";
import type { VehicleReport } from "@/lib/providers/types";
import { formatPlate } from "@/lib/format";
import { PageHeader } from "@/components/layout/page-header";
import { buttonVariants } from "@/components/ui/button";

export const metadata: Metadata = { title: "דוח רכב שמור", robots: { index: false, follow: false } };

/** Saved report: visible only to its owner (or staff) — enforced by RLS on vehicle_lookup_results. */
export default async function SavedReportPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase } = await requireUser(`/vehicle-check/${id}`);
  const { data } = await supabase.from("vehicle_lookup_results").select("id, report, fetched_at, plate_number").eq("id", id).maybeSingle();
  if (!data) notFound();
  const report = data.report as unknown as VehicleReport;
  return (
    <div className="container-page pb-16">
      <PageHeader
        eyebrow="דוח שמור"
        title={`דוח רכב ${formatPlate(data.plate_number)}`}
        description="הדוח מוצג רק לך. מספר הרישוי המלא אינו מוצג לציבור."
        actions={<Link href="/account/vehicle-checks" className={buttonVariants({ variant: "outline" })}><ArrowRight aria-hidden /> לכל הדוחות</Link>}
      />
      <VehicleReportView report={report} />
    </div>
  );
}
