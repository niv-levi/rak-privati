"use client";
import * as React from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/components/ui/toast";
import { resolveReportAction, decideAppealAction } from "../actions";

export function ReportRowActions({ reportId }: { reportId: string }) {
  const [notes, setNotes] = React.useState("");
  const [pending, start] = React.useTransition();
  const { push } = useToast();
  const router = useRouter();
  const go = (status: "resolved" | "dismissed" | "reviewing") => start(async () => { const r = await resolveReportAction(reportId, status, notes || undefined); push(r.ok ? { kind: "success", title: "עודכן" } : { kind: "error", title: r.error }); router.refresh(); });
  return (
    <div className="flex min-w-[200px] flex-col gap-1">
      <Textarea aria-label="הערת טיפול" value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} className="min-h-0 text-xs" placeholder="הערה" />
      <div className="flex gap-1"><Button size="sm" variant="outline" disabled={pending} onClick={() => go("reviewing")}>בטיפול</Button><Button size="sm" disabled={pending} onClick={() => go("resolved")}>טופל</Button><Button size="sm" variant="ghost" disabled={pending} onClick={() => go("dismissed")}>נדחה</Button></div>
    </div>
  );
}

export function AppealRowActions({ appealId, hasListing }: { appealId: string; hasListing: boolean }) {
  const [notes, setNotes] = React.useState("");
  const [restore, setRestore] = React.useState(hasListing);
  const [pending, start] = React.useTransition();
  const { push } = useToast();
  const router = useRouter();
  const go = (accepted: boolean) => start(async () => { const r = await decideAppealAction(appealId, accepted, notes, restore); push(r.ok ? { kind: "success", title: r.message ?? "נרשם" } : { kind: "error", title: r.error }); router.refresh(); });
  return (
    <div className="mt-3 space-y-2 rounded-md bg-secondary/50 p-3">
      <Textarea aria-label="נימוק ההחלטה (יוצג למשתמש)" placeholder="נימוק ההחלטה (יוצג למשתמש)" value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} />
      {hasListing && <div className="flex items-center gap-2"><Checkbox id={`restore-${appealId}`} checked={restore} onCheckedChange={(v) => setRestore(v === true)} /><label htmlFor={`restore-${appealId}`} className="text-xs">בקבלת הערעור – להחזיר את המודעה לפעילה</label></div>}
      <div className="flex gap-2"><Button size="sm" disabled={pending || !notes.trim()} onClick={() => go(true)}>קבלת הערעור</Button><Button size="sm" variant="outline" disabled={pending || !notes.trim()} onClick={() => go(false)}>דחיית הערעור</Button></div>
    </div>
  );
}
