"use client";
import * as React from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/components/ui/toast";
import { revokeDeclarationAction } from "../actions";

export function DeclarationControls() {
  const [open, setOpen] = React.useState(false);
  const [pending, start] = React.useTransition();
  const { push } = useToast();
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild><Button variant="outline" size="sm">ביטול ההצהרה</Button></DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>לבטל את הצהרת המוכר הפרטי?</DialogTitle><DialogDescription>כל המודעות הפעילות והממתינות שלכם יושהו מיד. כדי לפרסם שוב יהיה צורך להצהיר מחדש.</DialogDescription></DialogHeader>
        <DialogFooter>
          <Button variant="destructive" disabled={pending} onClick={() => start(async () => { const r = await revokeDeclarationAction(); push(r.ok ? { kind: "success", title: r.message ?? "בוצע" } : { kind: "error", title: r.error }); setOpen(false); })}>ביטול ההצהרה</Button>
          <Button variant="ghost" onClick={() => setOpen(false)}>חזרה</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
