"use client";
import * as React from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { NativeSelect } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/toast";
import { grantRoleAction, revokeRoleAction } from "../actions";
import { roleLabels } from "@/lib/labels";
import type { Role } from "@/lib/auth/guards";

const all: Role[] = ["super_admin", "moderator", "support", "data_manager", "analyst"];

export function RolesPanel({ userId, roles }: { userId: string; roles: Role[] }) {
  const [role, setRole] = React.useState<Role>("moderator");
  const [pending, start] = React.useTransition();
  const { push } = useToast();
  const router = useRouter();
  const go = (fn: () => Promise<{ ok: boolean; error?: string; message?: string }>) => start(async () => { const r = await fn(); push(r.ok ? { kind: "success", title: r.message ?? "בוצע" } : { kind: "error", title: r.error ?? "שגיאה" }); router.refresh(); });
  return (
    <Card>
      <CardHeader><CardTitle className="text-base">תפקידי צוות (מנהל ראשי בלבד)</CardTitle></CardHeader>
      <CardContent className="space-y-3 text-sm">
        <ul className="flex flex-wrap gap-1">{roles.map((r) => <li key={r} className="flex items-center gap-1"><Badge variant="secondary">{roleLabels[r]}</Badge><button type="button" className="text-xs text-destructive underline-offset-4 hover:underline" disabled={pending} onClick={() => go(() => revokeRoleAction(userId, r))}>הסרה</button></li>)}{roles.length === 0 && <li className="text-muted-foreground">אין תפקידים</li>}</ul>
        <div className="flex gap-2"><NativeSelect aria-label="תפקיד להענקה" value={role} onChange={(e) => setRole(e.target.value as Role)}>{all.filter((r) => !roles.includes(r)).map((r) => <option key={r} value={r}>{roleLabels[r]}</option>)}</NativeSelect><Button variant="outline" disabled={pending} onClick={() => go(() => grantRoleAction(userId, role))}>הענקה</Button></div>
        <p className="text-xs text-muted-foreground">הענקת תפקיד נאכפת גם במסד הנתונים: לא ניתן להעניק תפקיד לעצמך, וכל שינוי נרשם ביומן הביקורת.</p>
      </CardContent>
    </Card>
  );
}
