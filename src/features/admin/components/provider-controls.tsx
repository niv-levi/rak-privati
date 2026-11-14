"use client";
import * as React from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/components/ui/toast";
import { toggleProviderAction, testProviderLookupAction } from "../actions";

export function ProviderControls({ providerKey, enabled }: { providerKey: string; enabled: boolean }) {
  const [on, setOn] = React.useState(enabled);
  const [pending, start] = React.useTransition();
  const { push } = useToast();
  const router = useRouter();
  return (
    <div className="flex items-center justify-between gap-3 border-t border-border pt-3">
      <Label htmlFor={`p-${providerKey}`}>מקור פעיל</Label>
      <Switch id={`p-${providerKey}`} checked={on} disabled={pending} onCheckedChange={(v) => { setOn(v); start(async () => { const r = await toggleProviderAction(providerKey, v); if (!r.ok) { setOn(!v); push({ kind: "error", title: r.error }); } else router.refresh(); }); }} />
    </div>
  );
}

export function TestLookupForm() {
  const [plate, setPlate] = React.useState("");
  const [out, setOut] = React.useState<string | null>(null);
  const [pending, start] = React.useTransition();
  return (
    <form onSubmit={(e) => { e.preventDefault(); start(async () => { const r = await testProviderLookupAction(plate); setOut(r.ok ? r.data.summary : r.error); }); }} className="space-y-2">
      <Label htmlFor="test-plate">בדיקת חיבור – מספר רישוי לדוגמה</Label>
      <div className="flex gap-2"><Input id="test-plate" value={plate} onChange={(e) => setPlate(e.target.value)} dir="ltr" inputMode="numeric" className="num" /><Button type="submit" variant="outline" disabled={pending || !plate}>בדיקה</Button></div>
      {out && <p role="status" className="rounded-md bg-secondary p-2 text-xs" dir="auto">{out}</p>}
    </form>
  );
}
