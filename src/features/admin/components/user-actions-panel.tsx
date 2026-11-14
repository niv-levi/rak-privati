"use client";
import * as React from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";
import { userModerationAction } from "../actions";
import type { Enums } from "@/lib/database.types";

export function UserActionsPanel({ userId, currentStatus, reviewLevel, maxListings }: { userId: string; currentStatus: Enums<"account_status">; reviewLevel: Enums<"review_level">; maxListings: number | null }) {
  const [reason, setReason] = React.useState("");
  const [level, setLevel] = React.useState(reviewLevel);
  const [limit, setLimit] = React.useState(maxListings == null ? "" : String(maxListings));
  const [pending, start] = React.useTransition();
  const { push } = useToast();
  const router = useRouter();
  const run = (action: Parameters<typeof userModerationAction>[0]["action"], value?: string) => start(async () => { const r = await userModerationAction({ userId, action, reason, value }); push(r.ok ? { kind: "success", title: r.message ?? "בוצע" } : { kind: "error", title: r.error }); if (r.ok) { setReason(""); router.refresh(); } });
  return (
    <Card className="border-primary/30">
      <CardHeader><CardTitle className="text-base">פעולות על החשבון</CardTitle></CardHeader>
      <CardContent className="space-y-4 text-sm">
        <div className="space-y-1.5"><Label htmlFor="u-reason">סיבה (חובה, נרשמת ביומן ומוצגת למשתמש)</Label><Textarea id="u-reason" value={reason} onChange={(e) => setReason(e.target.value)} rows={3} maxLength={500} /></div>
        <div className="grid grid-cols-2 gap-2">
          {currentStatus !== "warned" && <Button variant="outline" disabled={pending || !reason} onClick={() => run("warn_user")}>אזהרה</Button>}
          {currentStatus !== "suspended" && <Button variant="outline" disabled={pending || !reason} onClick={() => run("suspend_user")}>השעיה</Button>}
          {currentStatus !== "blocked" && <Button variant="destructive" disabled={pending || !reason} onClick={() => run("block_user")}>חסימה</Button>}
          {currentStatus !== "active" && <Button disabled={pending || !reason} onClick={() => run("reinstate_user")}>שחזור לפעיל</Button>}
        </div>
        <div className="space-y-1.5"><Label htmlFor="u-level">רמת בדיקה למודעות חדשות</Label><div className="flex gap-2"><NativeSelect id="u-level" value={level} onChange={(e) => setLevel(e.target.value as Enums<"review_level">)}><option value="standard">רגילה</option><option value="strict">מחמירה (כל מודעה מסומנת לבדיקה ידנית מעמיקה)</option></NativeSelect><Button variant="outline" disabled={pending || !reason} onClick={() => run("set_review_level", level)}>עדכון</Button></div></div>
        <div className="space-y-1.5"><Label htmlFor="u-limit">מגבלת מודעות אישית (ריק = ברירת מחדל)</Label><div className="flex gap-2"><Input id="u-limit" type="number" min={0} max={50} value={limit} onChange={(e) => setLimit(e.target.value)} className="num" /><Button variant="outline" disabled={pending || !reason} onClick={() => run("set_listing_limit", limit)}>עדכון</Button></div></div>
        <p className="text-xs text-muted-foreground">השעיה וחסימה משהות מיד את כל המודעות הפעילות של המשתמש. אין תיוג אוטומטי כ״סוחר״ – ההחלטה תמיד אנושית ומנומקת.</p>
      </CardContent>
    </Card>
  );
}
