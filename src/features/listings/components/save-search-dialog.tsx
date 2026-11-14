"use client";
import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field } from "@/components/ui/field";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/toast";
import { saveSearchAction } from "@/features/account/actions";
import { describeFilters, filtersToQuery, type SearchFilters } from "../search-params";

export function SaveSearchDialog({ filters, loggedIn, children }: { filters: SearchFilters; loggedIn: boolean; children: React.ReactNode }) {
  const [open, setOpen] = React.useState(false);
  const [name, setName] = React.useState("");
  const [notify, setNotify] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [pending, start] = React.useTransition();
  const pathname = usePathname();
  const { push } = useToast();
  const suggested = describeFilters(filters);

  const submit = () =>
    start(async () => {
      setError(null);
      const r = await saveSearchAction({ name: name.trim() || suggested, query: filters, queryString: filtersToQuery(filters), notify });
      if (r.ok) {
        push({ kind: "success", title: "החיפוש נשמר", description: notify ? "נעדכן אותך כשיתפרסם רכב מתאים." : undefined });
        setOpen(false);
        setName("");
      } else setError(r.error);
    });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>שמירת חיפוש</DialogTitle>
          <DialogDescription>נשמור את המסננים הנוכחיים ונוכל להודיע לך על רכבים חדשים שמתאימים.</DialogDescription>
        </DialogHeader>
        {loggedIn ? (
          <div className="space-y-4">
            <Field id="search-name" label="שם החיפוש" description={`לדוגמה: ${suggested}`}>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder={suggested} maxLength={80} />
            </Field>
            <div className="flex items-center justify-between gap-3">
              <Label htmlFor="notify">לקבל התראה על רכבים חדשים</Label>
              <Switch id="notify" checked={notify} onCheckedChange={setNotify} />
            </div>
            {error && <p role="alert" className="text-sm font-semibold text-destructive">{error}</p>}
            <DialogFooter>
              <Button onClick={submit} disabled={pending}>{pending ? "שומר…" : "שמירה"}</Button>
              <Button variant="ghost" onClick={() => setOpen(false)}>ביטול</Button>
            </DialogFooter>
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">כדי לשמור חיפושים ולקבל התראות יש להתחבר עם מספר הטלפון.</p>
            <Link href={`/login?next=${encodeURIComponent(pathname + filtersToQuery(filters))}`} className={buttonVariants()}>כניסה</Link>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
