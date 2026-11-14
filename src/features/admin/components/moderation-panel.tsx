"use client";
import * as React from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, XCircle, Pencil, Pause, Play, Trash2, RotateCcw, StickyNote } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/select";
import { useToast } from "@/components/ui/toast";
import { moderateListingAction } from "../actions";
import type { Enums } from "@/lib/database.types";

const rejectReasons = ["חשד לפרסום מסחרי / סוחר", "תמונות לא ברורות או לא של הרכב", "פרטים שגויים או סותרים", "תיאור כולל פרטי קשר או קישורים", "רכב לא מתאים ללוח (מסחרי/אופנוע)", "מודעה כפולה", "אחר"];

export function ModerationPanel({ listingId, status }: { listingId: string; status: Enums<"listing_status"> }) {
  const [reason, setReason] = React.useState(rejectReasons[0]!);
  const [custom, setCustom] = React.useState("");
  const [notes, setNotes] = React.useState("");
  const [pending, start] = React.useTransition();
  const { push } = useToast();
  const router = useRouter();
  const run = (action: Parameters<typeof moderateListingAction>[0]["action"]) => start(async () => {
    const finalReason = reason === "אחר" ? custom : reason;
    const r = await moderateListingAction({ listingId, action, reason: ["reject", "request_correction", "remove"].includes(action) ? finalReason : custom || undefined, notes: notes || undefined });
    push(r.ok ? { kind: "success", title: r.message ?? "בוצע" } : { kind: "error", title: r.error });
    if (r.ok) { setNotes(""); router.refresh(); }
  });
  const pendingLike = status === "pending_review";
  return (
    <Card className="border-primary/30">
      <CardHeader><CardTitle className="text-base">פעולות בקרה</CardTitle></CardHeader>
      <CardContent className="space-y-4">
        {pendingLike && <Button className="w-full" onClick={() => run("approve")} disabled={pending}><CheckCircle2 aria-hidden /> אישור ופרסום</Button>}
        <div className="space-y-2">
          <Label htmlFor="mod-reason">סיבה (לדחייה / תיקון / הסרה)</Label>
          <NativeSelect id="mod-reason" value={reason} onChange={(e) => setReason(e.target.value)}>{rejectReasons.map((r) => <option key={r}>{r}</option>)}</NativeSelect>
          {reason === "אחר" && <Textarea aria-label="סיבה מותאמת" value={custom} onChange={(e) => setCustom(e.target.value)} placeholder="פרטו את הסיבה שתוצג למוכר" maxLength={500} />}
          <Label htmlFor="mod-notes">הערות פנימיות (לא מוצגות למוכר)</Label>
          <Textarea id="mod-notes" value={notes} onChange={(e) => setNotes(e.target.value)} maxLength={2000} rows={3} />
        </div>
        <div className="grid grid-cols-2 gap-2">
          {pendingLike && <Button variant="outline" onClick={() => run("request_correction")} disabled={pending}><Pencil aria-hidden /> בקשת תיקון</Button>}
          {pendingLike && <Button variant="destructive" onClick={() => run("reject")} disabled={pending}><XCircle aria-hidden /> דחייה</Button>}
          {status === "active" && <Button variant="outline" onClick={() => run("pause")} disabled={pending}><Pause aria-hidden /> השהיה</Button>}
          {status === "paused" && <Button variant="outline" onClick={() => run("unpause")} disabled={pending}><Play aria-hidden /> הפעלה</Button>}
          {status === "removed" && <Button variant="outline" onClick={() => run("restore")} disabled={pending}><RotateCcw aria-hidden /> שחזור</Button>}
          {status !== "removed" && <Button variant="ghost" className="text-destructive" onClick={() => run("remove")} disabled={pending}><Trash2 aria-hidden /> הסרה</Button>}
          <Button variant="ghost" onClick={() => run("note")} disabled={pending || !notes}><StickyNote aria-hidden /> שמירת הערה</Button>
        </div>
        <p className="text-xs text-muted-foreground">כל פעולה נרשמת ביומן הבקרה וביומן הביקורת. דחייה והסרה שולחות התראה למוכר עם הסיבה.</p>
      </CardContent>
    </Card>
  );
}
