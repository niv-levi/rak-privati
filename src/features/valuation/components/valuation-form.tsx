"use client";
import * as React from "react";
import { Scale } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field } from "@/components/ui/field";
import { NativeSelect } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Spinner } from "@/components/ui/spinner";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { conditionLabels, ownershipLabels } from "@/lib/labels";
import type { MakeOption, ModelOption } from "@/features/listings/queries/catalog";
import { valuationAction } from "../actions";
import type { ValuationResult } from "../engine";
import { ValuationResultView } from "./valuation-result";

export function ValuationForm({ makes, models, initial }: { makes: MakeOption[]; models: ModelOption[]; initial?: Partial<{ make_id: string; model_id: string; year: number; mileage_km: number; asking_price: number; ownership_count: number }> }) {
  const [v, setV] = React.useState({ make_id: initial?.make_id ?? "", model_id: initial?.model_id ?? "", year: initial?.year ? String(initial.year) : "", mileage_km: initial?.mileage_km ? String(initial.mileage_km) : "", ownership_count: initial?.ownership_count ? String(initial.ownership_count) : "", ownership_type: "", condition: "", known_damage: false, asking_price: initial?.asking_price ? String(initial.asking_price) : "" });
  const [result, setResult] = React.useState<ValuationResult | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [pending, start] = React.useTransition();
  const years = Array.from({ length: new Date().getFullYear() - 1979 + 1 }, (_, i) => new Date().getFullYear() + 1 - i);
  const set = (k: keyof typeof v, val: string | boolean) => setV((p) => ({ ...p, [k]: val }));
  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    start(async () => {
      setError(null);
      const r = await valuationAction({ ...v, mileage_km: v.mileage_km || undefined, ownership_count: v.ownership_count || undefined, ownership_type: v.ownership_type || undefined, condition: v.condition || undefined, asking_price: v.asking_price || undefined });
      if (!r.ok) return setError(r.error);
      setResult(r.result);
      requestAnimationFrame(() => document.getElementById("valuation-result")?.focus());
    });
  };
  React.useEffect(() => { if (initial?.model_id && initial?.year && !result) { const f = document.getElementById("valuation-form") as HTMLFormElement | null; f?.requestSubmit(); } }, []); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <div className="space-y-8">
      <form id="valuation-form" onSubmit={submit} className="grid gap-4 rounded-lg border border-border bg-card p-5 shadow-card sm:grid-cols-2 lg:grid-cols-3" noValidate aria-label="טופס הערכת שווי">
        <Field id="v-make" label="יצרן" required><NativeSelect value={v.make_id} onChange={(e) => { set("make_id", e.target.value); set("model_id", ""); }}><option value="">בחירה</option>{makes.map((m) => <option key={m.id} value={m.id}>{m.name_he}</option>)}</NativeSelect></Field>
        <Field id="v-model" label="דגם" required><NativeSelect value={v.model_id} onChange={(e) => set("model_id", e.target.value)} disabled={!v.make_id}><option value="">בחירה</option>{models.filter((m) => m.make_id === v.make_id).map((m) => <option key={m.id} value={m.id}>{m.name_he}</option>)}</NativeSelect></Field>
        <Field id="v-year" label="שנת ייצור" required><NativeSelect value={v.year} onChange={(e) => set("year", e.target.value)}><option value="">בחירה</option>{years.map((y) => <option key={y} value={y}>{y}</option>)}</NativeSelect></Field>
        <Field id="v-km" label="קילומטראז׳"><Input type="number" inputMode="numeric" dir="ltr" className="num" value={v.mileage_km} onChange={(e) => set("mileage_km", e.target.value)} min={0} step={1000} /></Field>
        <Field id="v-owners" label="מספר ידיים"><NativeSelect value={v.ownership_count} onChange={(e) => set("ownership_count", e.target.value)}><option value="">לא ידוע</option>{[1, 2, 3, 4, 5].map((n) => <option key={n} value={n}>{n}</option>)}</NativeSelect></Field>
        <Field id="v-own" label="סוג בעלות"><NativeSelect value={v.ownership_type} onChange={(e) => set("ownership_type", e.target.value)}><option value="">לא ידוע</option>{Object.entries(ownershipLabels).map(([k, l]) => <option key={k} value={k}>{l}</option>)}</NativeSelect></Field>
        <Field id="v-cond" label="מצב הרכב"><NativeSelect value={v.condition} onChange={(e) => set("condition", e.target.value)}><option value="">לא צוין</option>{Object.entries(conditionLabels).map(([k, l]) => <option key={k} value={k}>{l}</option>)}</NativeSelect></Field>
        <Field id="v-price" label="מחיר מבוקש להשוואה (₪)" description="אם יש לכם מחיר ביד – נראה איפה הוא יושב בטווח."><Input type="number" inputMode="numeric" dir="ltr" className="num" value={v.asking_price} onChange={(e) => set("asking_price", e.target.value)} min={1000} step={500} /></Field>
        <div className="flex items-center gap-2 self-end pb-2"><Checkbox id="v-damage" checked={v.known_damage} onCheckedChange={(c) => set("known_damage", c === true)} /><label htmlFor="v-damage" className="text-sm">ידוע על תאונה או תיקוני פחחות</label></div>
        <div className="sm:col-span-2 lg:col-span-3"><Button type="submit" size="lg" disabled={pending || !v.make_id || !v.model_id || !v.year}>{pending ? <Spinner label="מחשב" /> : <><Scale aria-hidden /> חישוב טווח מחיר</>}</Button></div>
      </form>
      {error && <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert>}
      {result && <div id="valuation-result" tabIndex={-1} className="outline-none"><ValuationResultView result={result} /></div>}
    </div>
  );
}
