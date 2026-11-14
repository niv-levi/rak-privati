"use client";
import * as React from "react";
import Image from "next/image";
import Link from "next/link";
import { Car, Pencil, Pause, Play, CheckCircle2, Trash2, Eye, Phone, Scale } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/toast";
import { formatPrice, formatDate } from "@/lib/format";
import { listingStatusLabels } from "@/lib/labels";
import { markSoldAction, setListingStatusAction, deleteDraftAction, submitAppealAction } from "@/features/listings/actions";
import type { Enums } from "@/lib/database.types";

type L = { id: string; make_name: string | null; model_name: string | null; trim_name: string | null; year: number | null; price: number | null; status: Enums<"listing_status">; created_at: string; published_at: string | null; expires_at: string | null; views_count: number; contact_count: number; rejection_reason: string | null; correction_notes: string | null; wizard_step: number };
type Appeal = { id: string; status: Enums<"appeal_status">; created_at: string; decision_notes: string | null } | null;

const statusVariant: Record<Enums<"listing_status">, "success" | "warning" | "muted" | "destructive" | "secondary"> = {
  active: "success", pending_review: "warning", needs_correction: "warning", draft: "muted", paused: "secondary", rejected: "destructive", sold: "secondary", expired: "muted", removed: "muted",
};

export function MyListingCard({ listing: l, coverUrl, appeal }: { listing: L; coverUrl: string | null; appeal: Appeal }) {
  const [pending, start] = React.useTransition();
  const [confirm, setConfirm] = React.useState<null | "sold" | "remove" | "delete">(null);
  const [appealOpen, setAppealOpen] = React.useState(false);
  const [appealMsg, setAppealMsg] = React.useState("");
  const { push } = useToast();
  const title = [l.make_name, l.model_name, l.trim_name].filter(Boolean).join(" ") || "טיוטה ללא פרטים";
  const run = (fn: () => Promise<{ ok: boolean; error?: string; message?: string }>) => start(async () => { const r = await fn(); push(r.ok ? { kind: "success", title: r.message ?? "בוצע" } : { kind: "error", title: r.error ?? "שגיאה" }); setConfirm(null); });
  const editable = l.status === "draft" || l.status === "needs_correction";

  return (
    <article className="flex flex-col gap-4 rounded-lg border border-border bg-card p-4 shadow-card sm:flex-row">
      <div className="relative aspect-[4/3] w-full shrink-0 overflow-hidden rounded-md bg-secondary sm:w-44">
        {coverUrl ? <Image src={coverUrl} alt="" fill sizes="176px" className="object-cover" unoptimized /> : <div className="flex h-full items-center justify-center text-muted-foreground"><Car aria-hidden /></div>}
      </div>
      <div className="min-w-0 flex-1 space-y-2">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <h3 className="font-bold">{title} {l.year && <span className="num">{l.year}</span>}</h3>
            <p className="text-xs text-muted-foreground">נוצרה <span className="num">{formatDate(l.created_at)}</span>{l.expires_at && l.status === "active" && <> · פגה ב-<span className="num">{formatDate(l.expires_at)}</span></>}</p>
          </div>
          <Badge variant={statusVariant[l.status]}>{listingStatusLabels[l.status]}</Badge>
        </div>
        <p className="text-lg font-extrabold num">{formatPrice(l.price)}</p>
        {l.status === "rejected" && l.rejection_reason && <p className="rounded-md bg-destructive-soft p-2 text-sm"><strong>סיבת הדחייה:</strong> {l.rejection_reason}</p>}
        {l.status === "needs_correction" && l.correction_notes && <p className="rounded-md bg-warning-soft p-2 text-sm"><strong>נדרש תיקון:</strong> {l.correction_notes}</p>}
        {appeal && <p className="text-xs text-muted-foreground">ערעור מ-<span className="num">{formatDate(appeal.created_at)}</span>: {appeal.status === "open" ? "בבדיקה" : appeal.status === "accepted" ? "התקבל" : "נדחה"}{appeal.decision_notes ? ` – ${appeal.decision_notes}` : ""}</p>}
        <p className="flex gap-4 text-xs text-muted-foreground"><span className="flex items-center gap-1"><Eye className="size-3.5" aria-hidden /><span className="num">{l.views_count}</span> צפיות</span><span className="flex items-center gap-1"><Phone className="size-3.5" aria-hidden /><span className="num">{l.contact_count}</span> חשיפות טלפון</span></p>
        <div className="flex flex-wrap gap-2 pt-1">
          {editable && <Link href={`/account/listings/${l.id}/edit`} className={buttonVariants({ size: "sm" })}><Pencil aria-hidden /> {l.status === "draft" ? "המשך עריכה" : "תיקון ושליחה מחדש"}</Link>}
          {(l.status === "active" || l.status === "paused" || l.status === "pending_review") && <Link href={`/account/listings/${l.id}/edit`} className={buttonVariants({ size: "sm", variant: "outline" })}><Pencil aria-hidden /> עריכה</Link>}
          {l.status !== "draft" && <Link href={`/cars/${l.id}`} className={buttonVariants({ size: "sm", variant: "ghost" })}><Eye aria-hidden /> צפייה</Link>}
          {l.status === "active" && <Link href={`/valuation?listing=${l.id}`} className={buttonVariants({ size: "sm", variant: "ghost" })}><Scale aria-hidden /> השוואת מחיר</Link>}
          {l.status === "active" && <Button size="sm" variant="outline" disabled={pending} onClick={() => run(() => setListingStatusAction(l.id, "paused"))}><Pause aria-hidden /> השהיה</Button>}
          {l.status === "paused" && <Button size="sm" variant="outline" disabled={pending} onClick={() => run(() => setListingStatusAction(l.id, "active"))}><Play aria-hidden /> הפעלה מחדש</Button>}
          {(l.status === "active" || l.status === "paused") && <Button size="sm" variant="secondary" disabled={pending} onClick={() => setConfirm("sold")}><CheckCircle2 aria-hidden /> נמכר!</Button>}
          {(l.status === "rejected" || l.status === "paused") && !appeal && <Button size="sm" variant="ghost" onClick={() => setAppealOpen(true)}>הגשת ערעור</Button>}
          {l.status === "draft" ? <Button size="sm" variant="ghost" className="text-destructive" disabled={pending} onClick={() => setConfirm("delete")}><Trash2 aria-hidden /> מחיקת טיוטה</Button>
            : l.status !== "sold" && <Button size="sm" variant="ghost" className="text-destructive" disabled={pending} onClick={() => setConfirm("remove")}><Trash2 aria-hidden /> הסרה</Button>}
        </div>
      </div>

      <Dialog open={!!confirm} onOpenChange={(o) => !o && setConfirm(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{confirm === "sold" ? "לסמן את הרכב כנמכר?" : confirm === "delete" ? "למחוק את הטיוטה?" : "להסיר את המודעה?"}</DialogTitle>
            <DialogDescription>{confirm === "sold" ? "המודעה תרד מהלוח ותפנה מקום למודעה חדשה. הפעולה אינה הפיכה." : confirm === "delete" ? "הטיוטה והתמונות שהועלו יימחקו לצמיתות." : "המודעה תוסר מהלוח ולא ניתן יהיה להחזיר אותה. ניתן לפרסם מודעה חדשה בכל עת."}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant={confirm === "sold" ? "default" : "destructive"} disabled={pending} onClick={() => run(() => confirm === "sold" ? markSoldAction(l.id) : confirm === "delete" ? deleteDraftAction(l.id) : setListingStatusAction(l.id, "removed"))}>אישור</Button>
            <Button variant="ghost" onClick={() => setConfirm(null)}>ביטול</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={appealOpen} onOpenChange={setAppealOpen}>
        <DialogTrigger asChild><span /></DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>ערעור על החלטת הבקרה</DialogTitle>
            <DialogDescription>הסבירו למה לדעתכם ההחלטה שגויה. צוות הבקרה יבדוק ויחזור אליכם בהתראה.</DialogDescription>
          </DialogHeader>
          <div className="space-y-1.5"><Label htmlFor={`appeal-${l.id}`}>ההודעה שלך</Label><Textarea id={`appeal-${l.id}`} value={appealMsg} onChange={(e) => setAppealMsg(e.target.value)} minLength={10} maxLength={2000} rows={5} /></div>
          <DialogFooter>
            <Button disabled={pending || appealMsg.trim().length < 10} onClick={() => run(async () => { const r = await submitAppealAction({ listingId: l.id, message: appealMsg }); if (r.ok) setAppealOpen(false); return r; })}>שליחת הערעור</Button>
            <Button variant="ghost" onClick={() => setAppealOpen(false)}>ביטול</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </article>
  );
}
