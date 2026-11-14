"use client";
import * as React from "react";
import Link from "next/link";
import { Bookmark } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { saveVehicleReportAction } from "../actions";

export function SaveReportButton({ resultId, loggedIn, title }: { resultId: string | null; loggedIn: boolean; title?: string }) {
  const [pending, start] = React.useTransition();
  const [saved, setSaved] = React.useState(false);
  const { push } = useToast();
  if (!resultId) return null;
  if (!loggedIn) return <Link href="/login?next=/account/vehicle-checks" className={buttonVariants({ variant: "outline" })}><Bookmark aria-hidden /> התחברות לשמירת הדוח</Link>;
  return (
    <Button variant="outline" disabled={pending || saved} onClick={() => start(async () => { const r = await saveVehicleReportAction(resultId, title); if (r.ok) { setSaved(true); push({ kind: "success", title: r.message ?? "נשמר" }); } else push({ kind: "error", title: r.error }); })}>
      <Bookmark aria-hidden /> {saved ? "הדוח נשמר" : "שמירת הדוח"}
    </Button>
  );
}
