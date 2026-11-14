"use client";
import * as React from "react";
import { useRouter } from "next/navigation";
import { Heart, Share2, Flag, GitCompareArrows, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/toast";
import { toggleFavoriteAction } from "@/features/account/actions";
import { reportListingAction } from "@/features/listings/actions";
import { reportReasonLabels } from "@/lib/labels";
import { useCompare } from "@/features/listings/compare-store";
import type { Enums } from "@/lib/database.types";

export function FavoriteButton({ listingId, initial, loggedIn, size = "default" }: { listingId: string; initial: boolean; loggedIn: boolean; size?: "default" | "sm" | "icon" }) {
  const [fav, setFav] = React.useState(initial);
  const [pending, start] = React.useTransition();
  const router = useRouter();
  const { push } = useToast();
  const toggle = () => {
    if (!loggedIn) return router.push(`/login?next=/cars/${listingId}`);
    const next = !fav;
    setFav(next);
    start(async () => {
      const r = await toggleFavoriteAction(listingId);
      if (!r.ok) { setFav(!next); push({ kind: "error", title: r.error }); } else push({ kind: "success", title: r.data.favorited ? "הרכב נשמר" : "הרכב הוסר מהשמורים" });
    });
  };
  return (
    <Button variant="outline" size={size} onClick={toggle} disabled={pending} aria-pressed={fav} aria-label={fav ? "הסרה מהרכבים השמורים" : "שמירת הרכב"}>
      <Heart aria-hidden className={fav ? "fill-brand-amber text-brand-amber" : undefined} /> {size !== "icon" && (fav ? "נשמר" : "שמירה")}
    </Button>
  );
}

export function ShareButton({ title, url }: { title: string; url: string }) {
  const { push } = useToast();
  const share = async () => {
    try {
      if (navigator.share) await navigator.share({ title, url });
      else { await navigator.clipboard.writeText(url); push({ kind: "success", title: "הקישור הועתק" }); }
    } catch { /* user cancelled */ }
  };
  return <Button variant="outline" onClick={share}><Share2 aria-hidden /> שיתוף</Button>;
}

export function CompareButton({ listingId }: { listingId: string }) {
  const { ids, toggle, hydrated } = useCompare();
  const active = ids.includes(listingId);
  const full = !active && ids.length >= 3;
  if (!hydrated) return <Button variant="outline" disabled><GitCompareArrows aria-hidden /> השוואה</Button>;
  return (
    <Button variant="outline" onClick={() => toggle(listingId)} aria-pressed={active} disabled={full} title={full ? "ניתן להשוות עד 3 רכבים" : undefined}>
      {active ? <Check aria-hidden /> : <GitCompareArrows aria-hidden />} {active ? "בהשוואה" : "השוואה"}
    </Button>
  );
}

export function ReportDialog({ listingId }: { listingId: string }) {
  const [open, setOpen] = React.useState(false);
  const [reason, setReason] = React.useState<Enums<"report_reason">>("suspected_dealer");
  const [details, setDetails] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);
  const [pending, start] = React.useTransition();
  const { push } = useToast();
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild><Button variant="ghost" className="text-muted-foreground"><Flag aria-hidden /> דיווח</Button></DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>דיווח על המודעה</DialogTitle>
          <DialogDescription>הדיווח אנונימי כלפי המוכר ומגיע לצוות הבקרה שלנו. דיווחים על סוחרים עוזרים לנו לשמור על הלוח פרטי באמת.</DialogDescription>
        </DialogHeader>
        <RadioGroup value={reason} onValueChange={(v) => setReason(v as Enums<"report_reason">)} aria-label="סיבת הדיווח">
          {(Object.keys(reportReasonLabels) as Enums<"report_reason">[]).map((k) => (
            <div key={k} className="flex items-center gap-2"><RadioGroupItem value={k} id={`r-${k}`} /><Label htmlFor={`r-${k}`} className="font-normal">{reportReasonLabels[k]}</Label></div>
          ))}
        </RadioGroup>
        <div className="space-y-1.5">
          <Label htmlFor="report-details">פרטים נוספים{reason === "other" ? "" : " (לא חובה)"}</Label>
          <Textarea id="report-details" value={details} onChange={(e) => setDetails(e.target.value)} maxLength={2000} placeholder="מה ראית שמעורר חשד?" />
        </div>
        {error && <p role="alert" className="text-sm font-semibold text-destructive">{error}</p>}
        <DialogFooter>
          <Button disabled={pending} onClick={() => start(async () => { setError(null); const r = await reportListingAction({ listingId, reason, details: details || undefined }); if (r.ok) { push({ kind: "success", title: r.message ?? "הדיווח התקבל" }); setOpen(false); } else setError(r.error); })}>שליחת הדיווח</Button>
          <Button variant="ghost" onClick={() => setOpen(false)}>ביטול</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
