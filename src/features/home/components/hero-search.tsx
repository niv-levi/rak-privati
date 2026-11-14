"use client";
import * as React from "react";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { NativeSelect } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import type { MakeOption, ModelOption, DistrictOption } from "@/features/listings/queries/catalog";
import { filtersToQuery } from "@/features/listings/search-params";

export function HeroSearch({ makes, models, districts }: { makes: MakeOption[]; models: ModelOption[]; districts: DistrictOption[] }) {
  const router = useRouter();
  const [make, setMake] = React.useState("");
  const [model, setModel] = React.useState("");
  const [priceMax, setPriceMax] = React.useState("");
  const [district, setDistrict] = React.useState("");
  const modelOptions = models.filter((m) => m.make_id === make);
  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    router.push(`/cars${filtersToQuery({ make: make ? [make] : undefined, model: model ? [model] : undefined, price_max: priceMax ? Number(priceMax) : undefined, district: district ? [district] : undefined })}`);
  };
  return (
    <form onSubmit={submit} className="grid gap-3 rounded-xl border border-border bg-card p-4 shadow-card-hover sm:grid-cols-2 lg:grid-cols-[1fr_1fr_1fr_1fr_auto] lg:items-end" aria-label="חיפוש מהיר">
      <div className="space-y-1.5"><Label htmlFor="hs-make">יצרן</Label><NativeSelect id="hs-make" value={make} onChange={(e) => { setMake(e.target.value); setModel(""); }}><option value="">כל היצרנים</option>{makes.map((m) => <option key={m.id} value={m.id}>{m.name_he}</option>)}</NativeSelect></div>
      <div className="space-y-1.5"><Label htmlFor="hs-model">דגם</Label><NativeSelect id="hs-model" value={model} onChange={(e) => setModel(e.target.value)} disabled={!make}><option value="">{make ? "כל הדגמים" : "בחרו יצרן"}</option>{modelOptions.map((m) => <option key={m.id} value={m.id}>{m.name_he}</option>)}</NativeSelect></div>
      <div className="space-y-1.5"><Label htmlFor="hs-price">מחיר עד</Label><NativeSelect id="hs-price" value={priceMax} onChange={(e) => setPriceMax(e.target.value)}><option value="">ללא הגבלה</option>{[30000, 50000, 70000, 90000, 120000, 150000, 200000, 300000].map((p) => <option key={p} value={p}>{p.toLocaleString("he-IL")} ₪</option>)}</NativeSelect></div>
      <div className="space-y-1.5"><Label htmlFor="hs-district">אזור</Label><NativeSelect id="hs-district" value={district} onChange={(e) => setDistrict(e.target.value)}><option value="">כל הארץ</option>{districts.map((d) => <option key={d.id} value={d.id}>{d.name_he.replace("מחוז ", "")}</option>)}</NativeSelect></div>
      <Button type="submit" size="lg" className="sm:col-span-2 lg:col-span-1"><Search aria-hidden /> חיפוש</Button>
    </form>
  );
}
