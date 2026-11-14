"use client";
import * as React from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/components/ui/toast";
import { updateValuationSourceAction } from "../actions";

export function ValuationSourceForm({ sourceKey, enabled, minComparables, windowDays }: { sourceKey: string; enabled: boolean; minComparables: number; windowDays: number }) {
  const [on, setOn] = React.useState(enabled);
  const [min, setMin] = React.useState(String(minComparables));
  const [win, setWin] = React.useState(String(windowDays));
  const [pending, start] = React.useTransition();
  const { push } = useToast();
  const router = useRouter();
  return (
    <form onSubmit={(e) => { e.preventDefault(); start(async () => { const r = await updateValuationSourceAction(sourceKey, { enabled: on, min_comparables: Number(min), window_days: Number(win) }); push(r.ok ? { kind: "success", title: "נשמר" } : { kind: "error", title: r.error }); router.refresh(); }); }} className="space-y-3 border-t border-border pt-3">
      <div className="flex items-center justify-between"><Label htmlFor="vs-on">מקור פעיל</Label><Switch id="vs-on" checked={on} onCheckedChange={setOn} /></div>
      <div className="grid grid-cols-2 gap-2"><div><Label htmlFor="vs-min">מינימום מודעות דומות</Label><Input id="vs-min" type="number" min={3} max={50} value={min} onChange={(e) => setMin(e.target.value)} className="num" /></div><div><Label htmlFor="vs-win">חלון (ימים)</Label><Input id="vs-win" type="number" min={14} max={365} value={win} onChange={(e) => setWin(e.target.value)} className="num" /></div></div>
      <Button type="submit" size="sm" variant="outline" disabled={pending}>שמירה</Button>
    </form>
  );
}
