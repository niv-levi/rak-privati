"use client";
import * as React from "react";
import Link from "next/link";
import { Trash2 } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { DataStatusBadge } from "@/features/vehicle-check/components/status-badge";
import { deleteSavedReportAction } from "@/features/vehicle-check/actions";
import { formatDate, formatPlate } from "@/lib/format";
import type { DataStatus } from "@/lib/providers/types";

export function SavedReportRow({ row }: { row: { id: string; resultId: string; title: string | null; createdAt: string; fetchedAt: string; plate: string; status: DataStatus; summary: string } }) {
  const [pending, start] = React.useTransition();
  const { push } = useToast();
  return (
    <div className="flex flex-col gap-3 rounded-lg border border-border bg-card p-4 shadow-card sm:flex-row sm:items-center sm:justify-between">
      <div>
        <p className="font-bold">{row.title || row.summary || "דוח רכב"} <span className="num text-sm font-normal text-muted-foreground">({formatPlate(row.plate)})</span></p>
        <p className="text-xs text-muted-foreground">הופק <span className="num">{formatDate(row.fetchedAt)}</span> · נשמר <span className="num">{formatDate(row.createdAt)}</span></p>
      </div>
      <div className="flex items-center gap-2">
        <DataStatusBadge status={row.status} />
        <Link href={`/vehicle-check/${row.resultId}`} className={buttonVariants({ size: "sm" })}>פתיחת הדוח</Link>
        <Button size="icon-sm" variant="ghost" className="text-destructive" disabled={pending} aria-label="מחיקת הדוח" onClick={() => start(async () => { const r = await deleteSavedReportAction(row.id); push(r.ok ? { kind: "success", title: "הדוח נמחק" } : { kind: "error", title: r.error }); })}><Trash2 aria-hidden /></Button>
      </div>
    </div>
  );
}
