"use client";
import * as React from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/components/ui/toast";
import { resolveFlagAction } from "../actions";
import { flagTypeLabels } from "@/lib/labels";
import { formatDateTime } from "@/lib/format";
import type { Enums } from "@/lib/database.types";

type Flag = { id: string; flag_type: Enums<"flag_type">; severity: number; status: Enums<"flag_status">; details: Record<string, unknown>; created_at: string; resolution: string | null };

export function FlagList({ flags, canModerate }: { flags: Flag[]; canModerate: boolean }) {
  const [pending, start] = React.useTransition();
  const { push } = useToast();
  const router = useRouter();
  const act = (id: string, status: "resolved" | "dismissed") => start(async () => { const r = await resolveFlagAction(id, status, status === "dismissed" ? "reviewed_no_issue" : "handled"); push(r.ok ? { kind: "success", title: "עודכן" } : { kind: "error", title: r.error }); router.refresh(); });
  return (
    <Card>
      <CardHeader><CardTitle className="text-base">דגלים אוטומטיים ({flags.length})</CardTitle></CardHeader>
      <CardContent>
        {flags.length === 0 ? <p className="text-sm text-muted-foreground">אין דגלים למודעה זו.</p> : (
          <ul className="space-y-2 text-sm">
            {flags.map((f) => (
              <li key={f.id} className="rounded-md border border-border p-2.5">
                <div className="flex items-center justify-between gap-2"><span className="font-semibold">{flagTypeLabels[f.flag_type]}</span><Badge variant={f.status === "open" ? (f.severity >= 3 ? "destructive" : "warning") : "muted"}>{f.status === "open" ? `פתוח · חומרה ${f.severity}` : f.status}</Badge></div>
                <p className="mt-1 text-xs text-muted-foreground" dir="ltr">{JSON.stringify(f.details)}</p>
                <p className="text-xs text-muted-foreground num">{formatDateTime(f.created_at)}</p>
                {canModerate && f.status === "open" && <div className="mt-2 flex gap-2"><Button size="sm" variant="outline" disabled={pending} onClick={() => act(f.id, "resolved")}>טופל</Button><Button size="sm" variant="ghost" disabled={pending} onClick={() => act(f.id, "dismissed")}>אין בעיה</Button></div>}
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
