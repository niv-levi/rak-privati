import Link from "next/link";
import { requireRole, hasRole } from "@/lib/auth/guards";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { ReportRowActions, AppealRowActions } from "@/features/admin/components/report-actions";
import { reportReasonLabels } from "@/lib/labels";
import { formatDateTime } from "@/lib/format";

export default async function AdminReportsPage() {
  const { supabase, roles } = await requireRole("any", "/admin/reports");
  const canModerate = hasRole(roles, "moderator");
  const [{ data: reports }, { data: appeals }] = await Promise.all([
    supabase.from("listing_reports").select("id, listing_id, reason, details, status, created_at, resolution_notes, listings(make_name, model_name, status)").order("status").order("created_at", { ascending: false }).limit(200),
    supabase.from("appeals").select("id, user_id, listing_id, message, status, created_at, decision_notes").order("status").order("created_at", { ascending: false }).limit(200),
  ]);
  const appealUserIds = [...new Set((appeals ?? []).map((a) => a.user_id))];
  const { data: appealProfiles } = appealUserIds.length ? await supabase.from("profiles").select("id, display_name").in("id", appealUserIds) : { data: [] };
  const nameBy = new Map((appealProfiles ?? []).map((p) => [p.id, p.display_name]));
  return (
    <div className="space-y-10">
      <section aria-labelledby="reports-h" className="space-y-4">
        <PageHeader title="דיווחים ותלונות" description="דיווחים על חשד לסוחר מקבלים חומרה גבוהה ופותחים דגל במודעה." className="py-0" />
        <div className="overflow-x-auto rounded-lg border border-border bg-card">
          <table className="w-full min-w-[760px] text-sm">
            <caption id="reports-h" className="sr-only">דיווחים</caption>
            <thead className="bg-secondary/60 text-xs text-muted-foreground"><tr><th scope="col" className="p-3 text-start">מודעה</th><th scope="col" className="p-3 text-start">סיבה</th><th scope="col" className="p-3 text-start">פרטים</th><th scope="col" className="p-3 text-start">תאריך</th><th scope="col" className="p-3 text-start">סטטוס</th><th scope="col" className="p-3"><span className="sr-only">פעולות</span></th></tr></thead>
            <tbody>
              {(reports ?? []).length === 0 && <tr><td colSpan={6} className="p-6 text-center text-muted-foreground">אין דיווחים.</td></tr>}
              {(reports ?? []).map((r) => { const l = r.listings as unknown as { make_name: string | null; model_name: string | null; status: string } | null; return (
                <tr key={r.id} className="border-t border-border align-top">
                  <td className="p-3"><Link href={`/admin/listings/${r.listing_id}`} className="font-semibold hover:underline underline-offset-4">{l?.make_name} {l?.model_name}</Link><p className="text-xs text-muted-foreground">{l?.status}</p></td>
                  <td className="p-3"><Badge variant={r.reason === "suspected_dealer" ? "destructive" : "muted"}>{reportReasonLabels[r.reason]}</Badge></td>
                  <td className="max-w-xs p-3 text-muted-foreground">{r.details || "—"}{r.resolution_notes && <p className="mt-1 text-xs">החלטה: {r.resolution_notes}</p>}</td>
                  <td className="p-3 text-xs text-muted-foreground"><span className="num">{formatDateTime(r.created_at)}</span></td>
                  <td className="p-3"><Badge variant={r.status === "open" ? "warning" : "muted"}>{r.status}</Badge></td>
                  <td className="p-3">{canModerate && r.status !== "resolved" && r.status !== "dismissed" && <ReportRowActions reportId={r.id} />}</td>
                </tr>
              ); })}
            </tbody>
          </table>
        </div>
      </section>
      <section id="appeals" aria-labelledby="appeals-h" className="space-y-4">
        <h2 id="appeals-h" className="text-h2 font-extrabold">ערעורים</h2>
        <ul className="space-y-3">
          {(appeals ?? []).length === 0 && <li className="rounded-lg border border-border bg-card p-6 text-center text-sm text-muted-foreground">אין ערעורים.</li>}
          {(appeals ?? []).map((a) => { const p = { display_name: nameBy.get(a.user_id) ?? null }; return (
            <li key={a.id} className="rounded-lg border border-border bg-card p-4 text-sm shadow-card">
              <div className="flex flex-wrap items-center justify-between gap-2"><p><Link href={`/admin/users/${a.user_id}`} className="font-bold hover:underline underline-offset-4">{p?.display_name ?? "משתמש"}</Link>{a.listing_id && <> · <Link href={`/admin/listings/${a.listing_id}`} className="text-primary underline-offset-4 hover:underline">המודעה</Link></>}</p><span className="flex items-center gap-2"><Badge variant={a.status === "open" ? "warning" : a.status === "accepted" ? "success" : "muted"}>{a.status}</Badge><span className="num text-xs text-muted-foreground">{formatDateTime(a.created_at)}</span></span></div>
              <p className="mt-2 whitespace-pre-line">{a.message}</p>
              {a.decision_notes && <p className="mt-2 text-muted-foreground">החלטה: {a.decision_notes}</p>}
              {canModerate && a.status === "open" && <AppealRowActions appealId={a.id} hasListing={!!a.listing_id} />}
            </li>
          ); })}
        </ul>
      </section>
    </div>
  );
}
