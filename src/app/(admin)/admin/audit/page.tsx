import { requireRole } from "@/lib/auth/guards";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { formatDateTime } from "@/lib/format";

export default async function AdminAuditPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sp = await searchParams;
  const { supabase } = await requireRole(["super_admin", "analyst"], "/admin/audit");
  const page = Math.max(1, Number(sp.page ?? 1) || 1);
  const size = 50;
  const { data: logs, count } = await supabase.from("audit_logs").select("seq, actor_id, actor_role, action, entity_type, entity_id, before_data, after_data, prev_hash, row_hash, created_at", { count: "exact" }).order("seq", { ascending: false }).range((page - 1) * size, page * size - 1);
  // Chain verification for the page shown (prev_hash of each row must equal row_hash of the previous row)
  const ordered = [...(logs ?? [])].reverse();
  let chainOk = true;
  for (let i = 1; i < ordered.length; i++) if (ordered[i]!.prev_hash !== ordered[i - 1]!.row_hash) { chainOk = false; break; }
  return (
    <div className="space-y-6">
      <PageHeader title="יומן ביקורת" description={<>רישום בלתי ניתן לשינוי עם שרשרת גיבוב. שלמות השרשרת בעמוד זה: <Badge variant={chainOk ? "success" : "destructive"}>{chainOk ? "תקינה" : "נמצאה אי-התאמה"}</Badge> · סה״כ <span className="num">{count ?? 0}</span> רשומות</>} className="py-0" />
      <div className="overflow-x-auto rounded-lg border border-border bg-card">
        <table className="w-full min-w-[900px] text-xs">
          <caption className="sr-only">רשומות יומן ביקורת</caption>
          <thead className="bg-secondary/60 text-muted-foreground"><tr><th scope="col" className="p-2 text-start">#</th><th scope="col" className="p-2 text-start">זמן</th><th scope="col" className="p-2 text-start">פעולה</th><th scope="col" className="p-2 text-start">ישות</th><th scope="col" className="p-2 text-start">מבצע</th><th scope="col" className="p-2 text-start">לפני → אחרי</th><th scope="col" className="p-2 text-start">hash</th></tr></thead>
          <tbody>
            {(logs ?? []).map((l) => <tr key={l.seq} className="border-t border-border align-top"><td className="p-2 num">{l.seq}</td><td className="p-2 num whitespace-nowrap">{formatDateTime(l.created_at)}</td><td className="p-2 font-semibold" dir="ltr">{l.action}</td><td className="p-2" dir="ltr">{l.entity_type}:{l.entity_id?.slice(0, 8)}</td><td className="p-2" dir="ltr">{l.actor_role} {l.actor_id?.slice(0, 8)}</td><td className="max-w-md p-2 font-mono text-[10px]" dir="ltr">{JSON.stringify(l.before_data)} → {JSON.stringify(l.after_data)}</td><td className="p-2 font-mono text-[10px]" dir="ltr" title={l.row_hash ?? ""}>{l.row_hash?.slice(0, 10)}…</td></tr>)}
            {(logs ?? []).length === 0 && <tr><td colSpan={7} className="p-6 text-center text-muted-foreground">אין רשומות.</td></tr>}
          </tbody>
        </table>
      </div>
      <nav aria-label="עמודים" className="flex gap-2 text-sm">{page > 1 && <a href={`/admin/audit?page=${page - 1}`} className="underline underline-offset-4">הקודם</a>}{(count ?? 0) > page * size && <a href={`/admin/audit?page=${page + 1}`} className="underline underline-offset-4">הבא</a>}</nav>
    </div>
  );
}
