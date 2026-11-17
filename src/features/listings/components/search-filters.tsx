"use client";
import * as React from "react";
import { useRouter, usePathname } from "next/navigation";
import { SlidersHorizontal, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger, SheetDescription } from "@/components/ui/sheet";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { bodyStyleLabels, categoryLabels, conditionLabels, fuelLabels, ownershipLabels, transmissionLabels } from "@/lib/labels";
import type { SearchFilters } from "../search-params";
import { filtersToQuery, countActiveFilters } from "../search-params";
import type { MakeOption, ModelOption, DistrictOption, CityOption } from "../queries/catalog";

type Props = { filters: SearchFilters; makes: MakeOption[]; models: ModelOption[]; districts: DistrictOption[]; cities: CityOption[] };

const currentYear = new Date().getFullYear();

function CheckboxGroup({ name, options, selected, onChange, columns = 1 }: { name: string; options: { value: string; label: string }[]; selected: string[]; onChange: (v: string[]) => void; columns?: 1 | 2 }) {
  return (
    <div className={columns === 2 ? "grid grid-cols-2 gap-2" : "flex flex-col gap-2"}>
      {options.map((o) => {
        const id = `${name}-${o.value}`;
        const checked = selected.includes(o.value);
        return (
          <div key={o.value} className="flex items-center gap-2">
            <Checkbox id={id} checked={checked} onCheckedChange={(v) => onChange(v === true ? [...selected, o.value] : selected.filter((x) => x !== o.value))} />
            <label htmlFor={id} className="text-sm leading-tight cursor-pointer">{o.label}</label>
          </div>
        );
      })}
    </div>
  );
}

function RangeInputs({ idPrefix, label, min, max, onMin, onMax, step = 1, placeholderMin, placeholderMax, unit }: { idPrefix: string; label: string; min?: number; max?: number; onMin: (v?: number) => void; onMax: (v?: number) => void; step?: number; placeholderMin?: string; placeholderMax?: string; unit?: string }) {
  const parse = (v: string) => (v === "" ? undefined : Math.max(0, Number(v)));
  return (
    <fieldset className="space-y-2">
      <legend className="text-sm font-semibold text-brand-dark">{label}{unit && <span className="text-muted-foreground font-normal"> ({unit})</span>}</legend>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <Label htmlFor={`${idPrefix}-min`} className="sr-only">{label} מינימום</Label>
          <Input id={`${idPrefix}-min`} type="number" inputMode="numeric" min={0} step={step} placeholder={placeholderMin ?? "מ-"} value={min ?? ""} onChange={(e) => onMin(parse(e.target.value))} className="num" />
        </div>
        <div>
          <Label htmlFor={`${idPrefix}-max`} className="sr-only">{label} מקסימום</Label>
          <Input id={`${idPrefix}-max`} type="number" inputMode="numeric" min={0} step={step} placeholder={placeholderMax ?? "עד"} value={max ?? ""} onChange={(e) => onMax(parse(e.target.value))} className="num" />
        </div>
      </div>
    </fieldset>
  );
}

function FiltersForm({ filters, makes, models, districts, cities, onApplied }: Props & { onApplied?: () => void }) {
  const router = useRouter();
  const pathname = usePathname();
  const [f, setF] = React.useState<SearchFilters>(filters);
  const [makeQuery, setMakeQuery] = React.useState("");
  const [cityQuery, setCityQuery] = React.useState("");

  const set = <K extends keyof SearchFilters>(k: K, v: SearchFilters[K]) => setF((prev) => ({ ...prev, [k]: v, page: 1 }));
  const apply = (e?: React.FormEvent) => {
    e?.preventDefault();
    router.push(`${pathname}${filtersToQuery({ ...f, page: 1 })}`);
    onApplied?.();
  };
  const clear = () => {
    router.push(pathname);
    onApplied?.();
  };

  const popular = makes.filter((m) => m.is_popular);
  const visibleMakes = makeQuery ? makes.filter((m) => m.name_he.includes(makeQuery) || m.name_en.toLowerCase().includes(makeQuery.toLowerCase())) : popular;
  const selectedMakes = f.make ?? [];
  const modelOptions = models.filter((m) => selectedMakes.includes(m.make_id));
  const selectedCities = f.city ?? [];
  const visibleCities = cityQuery ? cities.filter((c) => c.name_he.includes(cityQuery)).slice(0, 12) : cities.filter((c) => c.is_major).slice(0, 12);
  const radiusCity = selectedCities.length === 1 ? cities.find((c) => c.id === selectedCities[0]) : undefined;

  return (
    <form onSubmit={apply} className="flex flex-col gap-1" aria-label="סינון תוצאות">
      <div className="space-y-2 pb-3">
        <Label htmlFor="q">חיפוש חופשי</Label>
        <Input id="q" name="q" placeholder="למשל: קורולה היברידית" value={f.q ?? ""} onChange={(e) => set("q", e.target.value || undefined)} />
      </div>
      <Accordion type="multiple" defaultValue={["make", "price", "year", "location"]} className="w-full">
        <AccordionItem value="make">
          <AccordionTrigger>יצרן ודגם{selectedMakes.length > 0 && <span className="ms-auto me-2 text-xs text-primary num">{selectedMakes.length}</span>}</AccordionTrigger>
          <AccordionContent className="space-y-3">
            <Input aria-label="חיפוש יצרן" placeholder="חיפוש יצרן…" value={makeQuery} onChange={(e) => setMakeQuery(e.target.value)} />
            <div className="max-h-56 overflow-y-auto pe-1">
              <CheckboxGroup name="make" columns={2} options={[...visibleMakes, ...makes.filter((m) => selectedMakes.includes(m.id) && !visibleMakes.some((v) => v.id === m.id))].map((m) => ({ value: m.id, label: m.name_he }))} selected={selectedMakes} onChange={(v) => setF((p) => ({ ...p, make: v, model: (p.model ?? []).filter((id) => models.find((mo) => mo.id === id && v.includes(mo.make_id))), page: 1 }))} />
            </div>
            {modelOptions.length > 0 && (
              <div className="space-y-2 border-t border-border pt-3">
                <p className="text-sm font-semibold">דגם</p>
                <div className="max-h-56 overflow-y-auto pe-1">
                  <CheckboxGroup name="model" columns={2} options={modelOptions.map((m) => ({ value: m.id, label: selectedMakes.length > 1 ? `${makes.find((mk) => mk.id === m.make_id)?.name_he ?? ""} ${m.name_he}` : m.name_he }))} selected={f.model ?? []} onChange={(v) => set("model", v)} />
                </div>
              </div>
            )}
          </AccordionContent>
        </AccordionItem>
        <AccordionItem value="price">
          <AccordionTrigger>מחיר</AccordionTrigger>
          <AccordionContent>
            <RangeInputs idPrefix="price" label="טווח מחיר" unit="₪" step={1000} min={f.price_min} max={f.price_max} onMin={(v) => set("price_min", v)} onMax={(v) => set("price_max", v)} />
          </AccordionContent>
        </AccordionItem>
        <AccordionItem value="year">
          <AccordionTrigger>שנה וקילומטראז׳</AccordionTrigger>
          <AccordionContent className="space-y-4">
            <div className="space-y-2">
              <p className="text-sm font-semibold text-brand-dark">שנת ייצור</p>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label htmlFor="year_min" className="sr-only">משנה</Label>
                  <NativeSelect id="year_min" value={f.year_min ?? ""} onChange={(e) => set("year_min", e.target.value ? Number(e.target.value) : undefined)}>
                    <option value="">משנה</option>
                    {Array.from({ length: 30 }, (_, i) => currentYear + 1 - i).map((y) => <option key={y} value={y}>{y}</option>)}
                  </NativeSelect>
                </div>
                <div>
                  <Label htmlFor="year_max" className="sr-only">עד שנה</Label>
                  <NativeSelect id="year_max" value={f.year_max ?? ""} onChange={(e) => set("year_max", e.target.value ? Number(e.target.value) : undefined)}>
                    <option value="">עד שנה</option>
                    {Array.from({ length: 30 }, (_, i) => currentYear + 1 - i).map((y) => <option key={y} value={y}>{y}</option>)}
                  </NativeSelect>
                </div>
              </div>
            </div>
            <RangeInputs idPrefix="km" label="קילומטראז׳" unit="ק״מ" step={5000} min={f.km_min} max={f.km_max} onMin={(v) => set("km_min", v)} onMax={(v) => set("km_max", v)} />
            <div className="space-y-2">
              <Label htmlFor="owners_max">מספר ידיים (הצהרת המוכר)</Label>
              <NativeSelect id="owners_max" value={f.owners_max ?? ""} onChange={(e) => set("owners_max", e.target.value ? Number(e.target.value) : undefined)}>
                <option value="">ללא הגבלה</option>
                <option value="1">יד ראשונה בלבד</option>
                <option value="2">עד יד שנייה</option>
                <option value="3">עד יד שלישית</option>
              </NativeSelect>
            </div>
          </AccordionContent>
        </AccordionItem>
        <AccordionItem value="location">
          <AccordionTrigger>מיקום</AccordionTrigger>
          <AccordionContent className="space-y-4">
            <div className="space-y-2">
              <p className="text-sm font-semibold text-brand-dark">מחוז</p>
              <CheckboxGroup name="district" columns={2} options={districts.map((d) => ({ value: d.id, label: d.name_he.replace("מחוז ", "") }))} selected={f.district ?? []} onChange={(v) => set("district", v)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="city-search">עיר</Label>
              <Input id="city-search" placeholder="חיפוש עיר…" value={cityQuery} onChange={(e) => setCityQuery(e.target.value)} />
              <div className="max-h-44 overflow-y-auto pe-1">
                <CheckboxGroup name="city" options={[...visibleCities, ...cities.filter((c) => selectedCities.includes(c.id) && !visibleCities.some((v) => v.id === c.id))].map((c) => ({ value: c.id, label: c.name_he }))} selected={selectedCities} onChange={(v) => setF((p) => ({ ...p, city: v, radius_city: v.length === 1 ? v[0] : undefined, radius_km: v.length === 1 ? p.radius_km : undefined, page: 1 }))} />
              </div>
            </div>
            {radiusCity && (
              <div className="space-y-2">
                <Label htmlFor="radius_km">רדיוס מ{radiusCity.name_he}</Label>
                <NativeSelect id="radius_km" value={f.radius_km ?? ""} disabled={!radiusCity.has_coords} onChange={(e) => setF((p) => ({ ...p, radius_km: e.target.value ? Number(e.target.value) : undefined, radius_city: e.target.value ? radiusCity.id : undefined, city: e.target.value ? [] : [radiusCity.id], page: 1 }))}>
                  <option value="">בעיר בלבד</option>
                  {[10, 25, 50, 100].map((r) => <option key={r} value={r}>עד {r} ק״מ</option>)}
                </NativeSelect>
                {!radiusCity.has_coords && <p className="text-xs text-muted-foreground">אין נתוני מיקום ליישוב זה, לכן חיפוש לפי רדיוס אינו זמין.</p>}
              </div>
            )}
          </AccordionContent>
        </AccordionItem>
        <AccordionItem value="tech">
          <AccordionTrigger>מנוע ותיבת הילוכים</AccordionTrigger>
          <AccordionContent className="space-y-4">
            <div className="space-y-2"><p className="text-sm font-semibold text-brand-dark">דלק</p><CheckboxGroup name="fuel" columns={2} options={Object.entries(fuelLabels).map(([value, label]) => ({ value, label }))} selected={f.fuel ?? []} onChange={(v) => set("fuel", v)} /></div>
            <div className="space-y-2"><p className="text-sm font-semibold text-brand-dark">תיבת הילוכים</p><CheckboxGroup name="transmission" columns={2} options={Object.entries(transmissionLabels).map(([value, label]) => ({ value, label }))} selected={f.transmission ?? []} onChange={(v) => set("transmission", v)} /></div>
            <RangeInputs idPrefix="engine" label="נפח מנוע" unit="סמ״ק" step={100} min={f.engine_min} max={f.engine_max} onMin={(v) => set("engine_min", v)} onMax={(v) => set("engine_max", v)} />
          </AccordionContent>
        </AccordionItem>
        <AccordionItem value="body">
          <AccordionTrigger>סוג רכב</AccordionTrigger>
          <AccordionContent className="space-y-4">
            <div className="space-y-2"><p className="text-sm font-semibold text-brand-dark">קטגוריה</p><CheckboxGroup name="category" columns={2} options={Object.entries(categoryLabels).map(([value, label]) => ({ value, label }))} selected={f.category ?? []} onChange={(v) => set("category", v)} /></div>
            <div className="space-y-2"><p className="text-sm font-semibold text-brand-dark">מרכב</p><CheckboxGroup name="body" columns={2} options={Object.entries(bodyStyleLabels).map(([value, label]) => ({ value, label }))} selected={f.body ?? []} onChange={(v) => set("body", v)} /></div>
          </AccordionContent>
        </AccordionItem>
        <AccordionItem value="condition">
          <AccordionTrigger>מצב ובעלות</AccordionTrigger>
          <AccordionContent className="space-y-4">
            <div className="space-y-2"><p className="text-sm font-semibold text-brand-dark">סוג בעלות נוכחית</p><CheckboxGroup name="ownership" columns={2} options={Object.entries(ownershipLabels).map(([value, label]) => ({ value, label }))} selected={f.ownership ?? []} onChange={(v) => set("ownership", v)} /></div>
            <div className="space-y-2"><p className="text-sm font-semibold text-brand-dark">מצב הרכב (הצהרת המוכר)</p><CheckboxGroup name="condition" options={Object.entries(conditionLabels).map(([value, label]) => ({ value, label }))} selected={f.condition ?? []} onChange={(v) => set("condition", v)} /></div>
          </AccordionContent>
        </AccordionItem>
        <AccordionItem value="more">
          <AccordionTrigger>עוד אפשרויות</AccordionTrigger>
          <AccordionContent className="space-y-4">
            <div className="flex items-center justify-between gap-3"><Label htmlFor="recent">פורסמו בשבוע האחרון</Label><Switch id="recent" checked={f.recent_days === 7} onCheckedChange={(v) => set("recent_days", v ? 7 : undefined)} /></div>
            <div className="flex items-center justify-between gap-3"><Label htmlFor="reduced">רק עם ירידת מחיר</Label><Switch id="reduced" checked={!!f.price_reduced} onCheckedChange={(v) => set("price_reduced", v || undefined)} /></div>
            <div className="flex items-center justify-between gap-3"><Label htmlFor="official">רק עם נתוני רכב רשמיים</Label><Switch id="official" checked={!!f.has_official_data} onCheckedChange={(v) => set("has_official_data", v || undefined)} /></div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
      <div className="sticky bottom-0 -mx-1 mt-3 flex gap-2 bg-card/95 p-1 pt-3 backdrop-blur">
        <Button type="submit" className="flex-1">הצגת תוצאות</Button>
        <Button type="button" variant="ghost" onClick={clear}><X aria-hidden /> ניקוי</Button>
      </div>
    </form>
  );
}

export function SearchFilters(props: Props) {
  const [open, setOpen] = React.useState(false);
  const count = countActiveFilters(props.filters);
  return (
    <>
      <aside className="hidden lg:block" aria-label="סינון">
        <div className="sticky top-20 max-h-[calc(100dvh-6rem)] overflow-y-auto rounded-lg border border-border bg-card p-4 shadow-card">
          <h2 className="mb-2 flex items-center gap-2 text-base font-bold"><SlidersHorizontal className="size-4" aria-hidden /> סינון{count > 0 && <span className="rounded-full bg-primary px-2 py-0.5 text-xs text-white num">{count}</span>}</h2>
          <FiltersForm key={JSON.stringify(props.filters)} {...props} />
        </div>
      </aside>
      <div className="lg:hidden">
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger asChild>
            <Button variant="outline" className="w-full sm:w-auto">
              <SlidersHorizontal aria-hidden /> סינון{count > 0 && <span className="rounded-full bg-primary px-2 py-0.5 text-xs text-white num">{count}</span>}
            </Button>
          </SheetTrigger>
          <SheetContent side="bottom" className="max-h-[92dvh]">
            <SheetHeader>
              <SheetTitle>סינון תוצאות</SheetTitle>
              <SheetDescription className="sr-only">בחירת מסננים לחיפוש רכבים</SheetDescription>
            </SheetHeader>
            <div className="mt-4">
              <FiltersForm key={JSON.stringify(props.filters)} {...props} onApplied={() => setOpen(false)} />
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </>
  );
}
