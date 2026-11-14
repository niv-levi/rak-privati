"use client";
import * as React from "react";
import Link from "next/link";
import { Trash2, Search } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/toast";
import { deleteSavedSearchAction, toggleSavedSearchNotifyAction } from "../actions";
import { formatDate } from "@/lib/format";

export function SavedSearchRow({ search }: { search: { id: string; name: string; query_string: string; notify: boolean; created_at: string; last_notified_at: string | null } }) {
  const [notify, setNotify] = React.useState(search.notify);
  const [pending, start] = React.useTransition();
  const { push } = useToast();
  return (
    <div className="flex flex-col gap-3 rounded-lg border border-border bg-card p-4 shadow-card sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <p className="font-bold">{search.name}</p>
        <p className="text-xs text-muted-foreground">נשמר <span className="num">{formatDate(search.created_at)}</span>{search.last_notified_at && <> · התראה אחרונה <span className="num">{formatDate(search.last_notified_at)}</span></>}</p>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2"><Switch id={`n-${search.id}`} checked={notify} onCheckedChange={(v) => { setNotify(v); start(async () => { const r = await toggleSavedSearchNotifyAction(search.id, v); if (!r.ok) { setNotify(!v); push({ kind: "error", title: r.error }); } }); }} /><Label htmlFor={`n-${search.id}`} className="font-normal">התראות</Label></div>
        <Link href={`/cars${search.query_string}`} className={buttonVariants({ size: "sm" })}><Search aria-hidden /> הצגת תוצאות</Link>
        <Button size="icon-sm" variant="ghost" className="text-destructive" disabled={pending} aria-label="מחיקת החיפוש" onClick={() => start(async () => { const r = await deleteSavedSearchAction(search.id); push(r.ok ? { kind: "success", title: "החיפוש נמחק" } : { kind: "error", title: r.error }); })}><Trash2 aria-hidden /></Button>
      </div>
    </div>
  );
}
