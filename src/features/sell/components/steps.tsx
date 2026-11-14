"use client";
import * as React from "react";
import Link from "next/link";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ShieldCheck, Sparkles, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Field } from "@/components/ui/field";
import { NativeSelect } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { CityCombobox } from "@/components/shared/city-combobox";
import { DataStatusBadge } from "@/features/vehicle-check/components/status-badge";
import { formatPlateDigits } from "@/lib/vehicle/plate";
import { formatDate, formatNumber } from "@/lib/format";
import { bodyStyleLabels, conditionLabels, fuelLabels, ownershipLabels, transmissionLabels, equipmentOptions } from "@/lib/labels";
import { PRIVATE_SELLER_DECLARATION_TEXT } from "@/features/consents/text";
import type { VehicleReport } from "@/lib/providers/types";
import { vehicleStepSchema, saleStepSchema, conditionStepSchema, contactStepSchema, type VehicleStepInput, type SaleStepInput, type ConditionStepInput, type ContactStepInput } from "../schemas";
import { lookupForListingAction, confirmOfficialDataAction, saveVehicleStepAction, saveSaleStepAction, saveConditionStepAction, saveContactStepAction, acceptDeclarationAction } from "../actions";
import { StepShell, FormError } from "./step-shell";
import type { WizardData } from "./wizard-types";
import type { ActionResult } from "@/lib/actions/result";

type StepProps = { data: WizardData; onDone: () => void; onBack?: () => void; refresh: () => void };

function applyFieldErrors<T extends Record<string, unknown>>(r: ActionResult<unknown>, setError: (name: keyof T & string, err: { message: string }) => void) {
  if (r.ok) return;
  for (const [k, v] of Object.entries(r.fieldErrors ?? {})) setError(k as keyof T & string, { message: v });
}

// ---------------------------------------------------------------- 1. Plate
export function PlateStep({ data, onDone, refresh, initialPlate }: StepProps & { initialPlate?: string }) {
  const [plate, setPlate] = React.useState(data.plate ?? initialPlate ?? "");
  const [error, setError] = React.useState<string | null>(null);
  const [pending, start] = React.useTransition();
  const locked = !["draft", "needs_correction"].includes(data.listing.status);
  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    start(async () => {
      setError(null);
      const r = await lookupForListingAction(data.listing.id, plate);
      if (!r.ok) return setError(r.error);
      refresh();
      onDone();
    });
  };
  return (
    <form onSubmit={submit}>
      <StepShell title="מה מספר הרישוי של הרכב?" description={<>נשלוף את פרטי הרכב מהמקורות הציבוריים כדי לחסוך לך הקלדה ולהציג לקונים נתונים אמינים. <strong>המספר המלא לא יוצג לציבור</strong> – רק שתי הספרות האחרונות.</>} pending={pending} nextLabel="שליפת פרטי הרכב" nextDisabled={locked}>
        <Field id="plate" label="מספר רישוי" required error={error ?? undefined} description="7 או 8 ספרות">
          <Input value={plate} onChange={(e) => setPlate(e.target.value)} inputMode="numeric" dir="ltr" placeholder="12-345-67" className="h-14 max-w-xs text-center text-2xl font-bold tracking-[0.25em] num" disabled={locked} />
        </Field>
        {data.plate && <p className="text-sm text-muted-foreground">מספר נוכחי במודעה: <span className="num font-semibold">{formatPlateDigits(data.plate)}</span>{data.listing.official_data_fetched_at && <> · נשלף ב-<span className="num">{formatDate(data.listing.official_data_fetched_at)}</span></>}</p>}
        {data.plate && <Button type="button" variant="ghost" onClick={onDone}>המשך בלי לשלוף שוב</Button>}
        {locked && <Alert variant="info"><AlertDescription>לא ניתן לשנות מספר רישוי במודעה שכבר נשלחה.</AlertDescription></Alert>}
      </StepShell>
    </form>
  );
}

// ------------------------------------------------------------- 2. Official
export function OfficialStep({ data, onDone, onBack }: StepProps) {
  const report = data.listing.official_data as unknown as VehicleReport | null;
  const [confirmed, setConfirmed] = React.useState<boolean | null>(data.listing.discrepancy_notes ? false : null);
  const [notes, setNotes] = React.useState(data.listing.discrepancy_notes ?? "");
  const [error, setError] = React.useState<string | null>(null);
  const [pending, start] = React.useTransition();
  const submit = () =>
    start(async () => {
      setError(null);
      if (confirmed == null && report) return setError("יש לאשר שהפרטים נכונים או לציין מה שגוי");
      const r = await confirmOfficialDataAction(data.listing.id, { confirmed: confirmed ?? true, discrepancy_notes: notes });
      if (!r.ok) return setError(r.error);
      onDone();
    });
  const rows = report ? [
    { l: "יצרן", v: report.identification.make.value }, { l: "דגם", v: report.identification.commercialName.value ?? report.identification.model.value }, { l: "רמת גימור", v: report.identification.trim.value },
    { l: "שנת ייצור", v: report.identification.year.value }, { l: "צבע", v: report.identification.color.value }, { l: "דלק", v: report.specs.fuel.value },
    { l: "סוג בעלות רשום", v: report.registration.ownershipType.value }, { l: "עלייה לכביש", v: report.registration.firstOnRoad.value },
    { l: "טסט אחרון", v: report.registration.lastTestDate.value ? formatDate(report.registration.lastTestDate.value) : null }, { l: "נסועה בטסט האחרון", v: report.lastTestMileage.value != null ? `${formatNumber(report.lastTestMileage.value)} ק״מ` : null },
  ] : [];
  return (
    <StepShell title="האם הפרטים שנמצאו נכונים?" description="אלה הנתונים שהתקבלו מהמקורות הרשמיים. הם יוצגו לקונים בנפרד מהפרטים שלך, עם ציון מקור." onBack={onBack} onNext={submit} pending={pending}>
      {!report || report.overallStatus === "not_configured" || report.overallStatus === "unavailable" ? (
        <Alert variant="warning">
          <AlertTitle>לא התקבלו נתונים רשמיים</AlertTitle>
          <AlertDescription>{!report ? "לא בוצעה שליפה." : report.overallStatus === "not_configured" ? "מקורות המידע הממשלתיים טרם חוברו בסביבה זו." : "המקורות לא היו זמינים כרגע."} אפשר להמשיך ולמלא את הפרטים ידנית – המודעה תסומן כ״ללא נתונים רשמיים״.</AlertDescription>
        </Alert>
      ) : (
        <>
          <div className="flex items-center gap-2"><DataStatusBadge status={report.overallStatus} /><span className="text-xs text-muted-foreground">נשלף ב-<span className="num">{formatDate(report.fetchedAt)}</span></span></div>
          <dl className="grid gap-2 sm:grid-cols-2">
            {rows.map((r) => (
              <div key={r.l} className="flex justify-between gap-3 rounded-md bg-secondary/70 px-3 py-2 text-sm"><dt className="text-muted-foreground">{r.l}</dt><dd className="font-semibold num text-end">{r.v ?? <span className="font-normal text-muted-foreground">לא נמצא</span>}</dd></div>
            ))}
          </dl>
          <RadioGroup value={confirmed == null ? "" : confirmed ? "yes" : "no"} onValueChange={(v) => setConfirmed(v === "yes")} aria-label="אישור הנתונים">
            <div className="flex items-center gap-2"><RadioGroupItem value="yes" id="ok-yes" /><Label htmlFor="ok-yes" className="font-normal">הפרטים נכונים</Label></div>
            <div className="flex items-center gap-2"><RadioGroupItem value="no" id="ok-no" /><Label htmlFor="ok-no" className="font-normal">חלק מהפרטים שגויים – אני רוצה לציין זאת</Label></div>
          </RadioGroup>
          {confirmed === false && (
            <Field id="discrepancy" label="מה לא מדויק?" required description="ההערה תוצג לקונים לצד הנתונים הרשמיים. הנתונים הרשמיים עצמם לא ישתנו.">
              <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} maxLength={1000} />
            </Field>
          )}
        </>
      )}
      <FormError message={error} />
    </StepShell>
  );
}

// -------------------------------------------------------------- 3. Vehicle
export function VehicleStep({ data, onDone, onBack, refresh }: StepProps) {
  const l = data.listing;
  const form = useForm<VehicleStepInput>({
    resolver: zodResolver(vehicleStepSchema),
    defaultValues: {
      make_id: l.make_id ?? "", model_id: l.model_id ?? "", trim_id: l.trim_id ?? "", trim_name: l.trim_name ?? "", year: l.year ?? ("" as unknown as number), mileage_km: l.mileage_km ?? ("" as unknown as number),
      ownership_count_declared: l.ownership_count_declared ?? ("" as unknown as number), ownership_type: l.ownership_type ?? ("" as never), fuel_type: l.fuel_type ?? ("" as never), transmission: l.transmission ?? ("" as never),
      engine_cc: l.engine_cc ?? ("" as unknown as number), body_style: l.body_style ?? "", color: l.color ?? "", first_registration_date: l.first_registration_date ? l.first_registration_date.slice(0, 7) : "",
    },
  });
  const [serverError, setServerError] = React.useState<string | null>(null);
  const [pending, start] = React.useTransition();
  const makeId = form.watch("make_id");
  const modelId = form.watch("model_id");
  const models = data.models.filter((m) => m.make_id === makeId);
  const trims = data.trims.filter((t) => t.model_id === modelId);
  const years = Array.from({ length: new Date().getFullYear() - 1979 + 1 }, (_, i) => new Date().getFullYear() + 1 - i);
  const E = form.formState.errors;
  const onSubmit = form.handleSubmit((values) =>
    start(async () => {
      setServerError(null);
      const r = await saveVehicleStepAction(l.id, values);
      if (!r.ok) { applyFieldErrors<VehicleStepInput>(r, form.setError as never); return setServerError(r.error); }
      refresh(); onDone();
    })
  );
  const prefilled = !!l.official_data;
  return (
    <form onSubmit={onSubmit} noValidate>
      <StepShell title="פרטי הרכב" description={prefilled ? "מילאנו מראש מה שהצלחנו לזהות מהנתונים הרשמיים. בדקו והשלימו את החסר." : "מלאו את פרטי הרכב. פרטים מדויקים מקצרים את זמן האישור."} onBack={onBack} pending={pending}>
        <div className="grid gap-5 sm:grid-cols-2">
          <Field id="make_id" label="יצרן" required error={E.make_id?.message}>
            <NativeSelect {...form.register("make_id", { onChange: () => { form.setValue("model_id", ""); form.setValue("trim_id", ""); } })}>
              <option value="">בחירת יצרן</option>
              <optgroup label="נפוצים">{data.makes.filter((m) => m.is_popular).map((m) => <option key={m.id} value={m.id}>{m.name_he}</option>)}</optgroup>
              <optgroup label="כל היצרנים">{data.makes.filter((m) => !m.is_popular).map((m) => <option key={m.id} value={m.id}>{m.name_he}</option>)}</optgroup>
            </NativeSelect>
          </Field>
          <Field id="model_id" label="דגם" required error={E.model_id?.message}>
            <NativeSelect {...form.register("model_id", { onChange: () => form.setValue("trim_id", "") })} disabled={!makeId}>
              <option value="">{makeId ? "בחירת דגם" : "בחרו יצרן קודם"}</option>
              {models.map((m) => <option key={m.id} value={m.id}>{m.name_he}</option>)}
            </NativeSelect>
          </Field>
          {trims.length > 0 ? (
            <Field id="trim_id" label="רמת גימור" error={E.trim_id?.message}>
              <NativeSelect {...form.register("trim_id")}><option value="">לא ידוע / אחר</option>{trims.map((t) => <option key={t.id} value={t.id}>{t.name_he}</option>)}</NativeSelect>
            </Field>
          ) : (
            <Field id="trim_name" label="רמת גימור" error={E.trim_name?.message} description="למשל: Hybrid Sense, Style, GT Line">
              <Input {...form.register("trim_name")} maxLength={80} />
            </Field>
          )}
          <Field id="year" label="שנת ייצור" required error={E.year?.message}>
            <NativeSelect {...form.register("year")}><option value="">בחירת שנה</option>{years.map((y) => <option key={y} value={y}>{y}</option>)}</NativeSelect>
          </Field>
          <Field id="first_registration_date" label="חודש עלייה לכביש" error={E.first_registration_date?.message}>
            <Input type="month" dir="ltr" {...form.register("first_registration_date")} />
          </Field>
          <Field id="mileage_km" label="קילומטראז׳ נוכחי" required error={E.mileage_km?.message} description={l.test_mileage_km ? `בטסט האחרון נרשמו ${formatNumber(l.test_mileage_km)} ק״מ` : undefined}>
            <Input type="number" inputMode="numeric" min={0} step={1000} dir="ltr" className="num" {...form.register("mileage_km")} />
          </Field>
          <Field id="ownership_count_declared" label="מספר ידיים (כולל שלך)" required error={E.ownership_count_declared?.message}>
            <NativeSelect {...form.register("ownership_count_declared")}><option value="">בחירה</option>{[1, 2, 3, 4, 5, 6].map((n) => <option key={n} value={n}>{n === 1 ? "יד ראשונה" : `יד ${n}`}</option>)}<option value="7">7 ומעלה</option></NativeSelect>
          </Field>
          <Field id="ownership_type" label="סוג הבעלות הנוכחית" required error={E.ownership_type?.message} description="אם הרכב רשום על חברה או ליסינג – ציינו זאת. מודעות של גופים מסחריים אינן מותרות.">
            <NativeSelect {...form.register("ownership_type")}><option value="">בחירה</option>{Object.entries(ownershipLabels).map(([v, lbl]) => <option key={v} value={v}>{lbl}</option>)}</NativeSelect>
          </Field>
          <Field id="fuel_type" label="סוג דלק" required error={E.fuel_type?.message}>
            <NativeSelect {...form.register("fuel_type")}><option value="">בחירה</option>{Object.entries(fuelLabels).map(([v, lbl]) => <option key={v} value={v}>{lbl}</option>)}</NativeSelect>
          </Field>
          <Field id="transmission" label="תיבת הילוכים" required error={E.transmission?.message}>
            <NativeSelect {...form.register("transmission")}><option value="">בחירה</option>{Object.entries(transmissionLabels).map(([v, lbl]) => <option key={v} value={v}>{lbl}</option>)}</NativeSelect>
          </Field>
          <Field id="engine_cc" label="נפח מנוע (סמ״ק)" error={E.engine_cc?.message}>
            <Input type="number" inputMode="numeric" min={0} max={10000} step={100} dir="ltr" className="num" {...form.register("engine_cc")} />
          </Field>
          <Field id="body_style" label="סוג מרכב" error={E.body_style?.message}>
            <NativeSelect {...form.register("body_style")}><option value="">בחירה</option>{Object.entries(bodyStyleLabels).map(([v, lbl]) => <option key={v} value={v}>{lbl}</option>)}</NativeSelect>
          </Field>
          <Field id="color" label="צבע" error={E.color?.message}>
            <Input {...form.register("color")} maxLength={40} />
          </Field>
        </div>
        <FormError message={serverError} />
      </StepShell>
    </form>
  );
}

// ------------------------------------------------------------------ 4. Sale
export function SaleStep({ data, onDone, onBack, refresh }: StepProps) {
  const l = data.listing;
  const form = useForm<SaleStepInput>({ resolver: zodResolver(saleStepSchema), defaultValues: { price: l.price ?? ("" as unknown as number), city_id: l.city_id ?? "", neighborhood: l.neighborhood ?? "", condition: l.condition ?? ("" as never) } });
  const [serverError, setServerError] = React.useState<string | null>(null);
  const [pending, start] = React.useTransition();
  const E = form.formState.errors;
  const onSubmit = form.handleSubmit((values) => start(async () => { setServerError(null); const r = await saveSaleStepAction(l.id, values); if (!r.ok) { applyFieldErrors<SaleStepInput>(r, form.setError as never); return setServerError(r.error); } refresh(); onDone(); }));
  return (
    <form onSubmit={onSubmit} noValidate>
      <StepShell title="פרטי המכירה" description="המחיר המבוקש, מיקום הרכב ומצבו הכללי." onBack={onBack} pending={pending}>
        <div className="grid gap-5 sm:grid-cols-2">
          <Field id="price" label="מחיר מבוקש (₪)" required error={E.price?.message} description="אחרי הפרסום תוכלו להוריד מחיר; קונים ששמרו את הרכב יקבלו התראה.">
            <Input type="number" inputMode="numeric" min={1000} step={500} dir="ltr" className="num text-lg font-bold" {...form.register("price")} />
          </Field>
          <Field id="condition" label="מצב כללי של הרכב" required error={E.condition?.message}>
            <NativeSelect {...form.register("condition")}><option value="">בחירה</option>{Object.entries(conditionLabels).map(([v, lbl]) => <option key={v} value={v}>{lbl}</option>)}</NativeSelect>
          </Field>
          <Field id="city_id" label="יישוב" required error={E.city_id?.message} description="המיקום שבו ניתן לראות את הרכב.">
            <Controller control={form.control} name="city_id" render={({ field }) => <CityCombobox id="city_id" cities={data.cities} value={field.value || null} onChange={(id) => field.onChange(id ?? "")} invalid={!!E.city_id} />} />
          </Field>
          <Field id="neighborhood" label="שכונה / אזור" error={E.neighborhood?.message}>
            <Input {...form.register("neighborhood")} maxLength={80} />
          </Field>
        </div>
        <FormError message={serverError} />
      </StepShell>
    </form>
  );
}

// ------------------------------------------------------------- 6. Condition
export function ConditionStep({ data, onDone, onBack, refresh }: StepProps) {
  const l = data.listing;
  const form = useForm<ConditionStepInput>({
    resolver: zodResolver(conditionStepSchema),
    defaultValues: { maintenance_history: l.maintenance_history ?? "", accident_declared: l.accident_declared == null ? ("" as never) : l.accident_declared ? "yes" : "no", accident_details: l.accident_details ?? "", body_repairs_declared: l.body_repairs_declared == null ? ("" as never) : l.body_repairs_declared ? "yes" : "no", body_repair_details: l.body_repair_details ?? "", equipment: l.equipment ?? [], description: l.description ?? "" },
  });
  const [serverError, setServerError] = React.useState<string | null>(null);
  const [pending, start] = React.useTransition();
  const E = form.formState.errors;
  const accident = form.watch("accident_declared");
  const repairs = form.watch("body_repairs_declared");
  const desc = form.watch("description") ?? "";
  const onSubmit = form.handleSubmit((values) => start(async () => { setServerError(null); const r = await saveConditionStepAction(l.id, values); if (!r.ok) { applyFieldErrors<ConditionStepInput>(r, form.setError as never); return setServerError(r.error); } refresh(); onDone(); }));
  return (
    <form onSubmit={onSubmit} noValidate>
      <StepShell title="מצב הרכב ותיאור" description="כנות משתלמת: מודעות שמפרטות את מצב הרכב באמת זוכות לפחות ביטולים ויותר אמון." onBack={onBack} pending={pending}>
        <div className="space-y-5">
          <fieldset className="space-y-2">
            <legend className="text-sm font-semibold text-brand-dark">האם הרכב היה מעורב בתאונה? <span aria-hidden className="text-destructive">*</span></legend>
            <Controller control={form.control} name="accident_declared" render={({ field }) => (
              <RadioGroup value={field.value} onValueChange={field.onChange} className="flex gap-6" aria-invalid={!!E.accident_declared}>
                <div className="flex items-center gap-2"><RadioGroupItem value="no" id="acc-no" /><Label htmlFor="acc-no" className="font-normal">לא, למיטב ידיעתי</Label></div>
                <div className="flex items-center gap-2"><RadioGroupItem value="yes" id="acc-yes" /><Label htmlFor="acc-yes" className="font-normal">כן</Label></div>
              </RadioGroup>
            )} />
            {E.accident_declared && <p role="alert" className="text-xs font-semibold text-destructive">{E.accident_declared.message}</p>}
            {accident === "yes" && <Field id="accident_details" label="פרטי התאונה והתיקון" required error={E.accident_details?.message}><Textarea {...form.register("accident_details")} maxLength={1000} /></Field>}
          </fieldset>
          <fieldset className="space-y-2">
            <legend className="text-sm font-semibold text-brand-dark">האם בוצעו תיקוני פחחות או צבע? <span aria-hidden className="text-destructive">*</span></legend>
            <Controller control={form.control} name="body_repairs_declared" render={({ field }) => (
              <RadioGroup value={field.value} onValueChange={field.onChange} className="flex gap-6">
                <div className="flex items-center gap-2"><RadioGroupItem value="no" id="rep-no" /><Label htmlFor="rep-no" className="font-normal">לא</Label></div>
                <div className="flex items-center gap-2"><RadioGroupItem value="yes" id="rep-yes" /><Label htmlFor="rep-yes" className="font-normal">כן</Label></div>
              </RadioGroup>
            )} />
            {E.body_repairs_declared && <p role="alert" className="text-xs font-semibold text-destructive">{E.body_repairs_declared.message}</p>}
            {repairs === "yes" && <Field id="body_repair_details" label="אילו תיקונים בוצעו?" error={E.body_repair_details?.message}><Textarea {...form.register("body_repair_details")} maxLength={1000} /></Field>}
          </fieldset>
          <Field id="maintenance_history" label="היסטוריית טיפולים" error={E.maintenance_history?.message} description="איפה טופל הרכב, מתי בוצע הטיפול האחרון, האם יש ספר טיפולים.">
            <Textarea {...form.register("maintenance_history")} maxLength={2000} />
          </Field>
          <fieldset className="space-y-2">
            <legend className="text-sm font-semibold text-brand-dark">אבזור נוסף</legend>
            <Controller control={form.control} name="equipment" render={({ field }) => (
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {equipmentOptions.map((o) => {
                  const checked = (field.value ?? []).includes(o.value);
                  return <div key={o.value} className="flex items-center gap-2"><Checkbox id={`eq-${o.value}`} checked={checked} onCheckedChange={(v) => field.onChange(v === true ? [...(field.value ?? []), o.value] : (field.value ?? []).filter((x: string) => x !== o.value))} /><label htmlFor={`eq-${o.value}`} className="text-sm">{o.label}</label></div>;
                })}
              </div>
            )} />
          </fieldset>
          <Field id="description" label="תיאור חופשי" required error={E.description?.message} description={<span className="flex justify-between"><span>ספרו על הרכב כפי שהייתם רוצים לשמוע בתור קונים. בלי מספרי טלפון וקישורים – פרטי הקשר מוצגים דרך המערכת.</span><span className="num">{desc.length}/4000</span></span>}>
            <Textarea {...form.register("description")} maxLength={4000} rows={6} />
          </Field>
        </div>
        <FormError message={serverError} />
      </StepShell>
    </form>
  );
}

// ---------------------------------------------------------------- 7. Contact
export function ContactStep({ data, onDone, onBack, refresh }: StepProps) {
  const l = data.listing;
  const form = useForm<ContactStepInput>({ resolver: zodResolver(contactStepSchema), defaultValues: { display_name: data.profile.display_name ?? "", contact_phone_opt_in: l.contact_phone_opt_in, contact_whatsapp_opt_in: l.contact_whatsapp_opt_in, contact_hours: l.contact_hours ?? "" } });
  const [serverError, setServerError] = React.useState<string | null>(null);
  const [pending, start] = React.useTransition();
  const E = form.formState.errors;
  const onSubmit = form.handleSubmit((values) => start(async () => { setServerError(null); const r = await saveContactStepAction(l.id, values); if (!r.ok) { applyFieldErrors<ContactStepInput>(r, form.setError as never); return setServerError(r.error); } refresh(); onDone(); }));
  return (
    <form onSubmit={onSubmit} noValidate>
      <StepShell title="איך קונים ייצרו איתך קשר?" description="מספר הטלפון המאומת שלך נחשף רק למשתמשים מחוברים, רק אחרי לחיצה מכוונת, ורק בערוצים שתאשר/י כאן." onBack={onBack} pending={pending}>
        <div className="space-y-5">
          <Field id="display_name" label="שם לתצוגה" required error={E.display_name?.message} description="שם פרטי מספיק. כך הקונים יראו אותך במודעה.">
            <Input {...form.register("display_name")} maxLength={60} autoComplete="given-name" />
          </Field>
          <div className="rounded-md border border-border bg-secondary/50 p-4 text-sm">
            מספר הטלפון המאומת בחשבון: <span className="num font-semibold">{data.profile.phone_masked}</span>. לשינוי המספר יש לפנות לעמוד האבטחה בחשבון.
          </div>
          <div className="space-y-3">
            <Controller control={form.control} name="contact_phone_opt_in" render={({ field }) => (
              <div className="flex items-center justify-between gap-3 rounded-md border border-border p-3"><Label htmlFor="opt-phone">אפשר להתקשר אליי</Label><Switch id="opt-phone" checked={field.value} onCheckedChange={field.onChange} /></div>
            )} />
            <Controller control={form.control} name="contact_whatsapp_opt_in" render={({ field }) => (
              <div className="flex items-center justify-between gap-3 rounded-md border border-border p-3"><Label htmlFor="opt-wa">אפשר לשלוח לי הודעת WhatsApp</Label><Switch id="opt-wa" checked={field.value} onCheckedChange={field.onChange} /></div>
            )} />
            {E.contact_phone_opt_in && <p role="alert" className="text-xs font-semibold text-destructive">{E.contact_phone_opt_in.message}</p>}
          </div>
          <Field id="contact_hours" label="שעות נוחות ליצירת קשר" error={E.contact_hours?.message} description="למשל: אחה״צ וערב, לא בשבת">
            <Input {...form.register("contact_hours")} maxLength={120} />
          </Field>
        </div>
        <FormError message={serverError} />
      </StepShell>
    </form>
  );
}

// ------------------------------------------------------------ 8. Declaration
export function DeclarationStep({ data, onDone, onBack, refresh }: StepProps) {
  const [accepted, setAccepted] = React.useState(!!data.listing.declaration_id);
  const [error, setError] = React.useState<string | null>(null);
  const [pending, start] = React.useTransition();
  const already = !!data.listing.declaration_id;
  const submit = () => start(async () => {
    setError(null);
    if (already) return onDone();
    const r = await acceptDeclarationAction(data.listing.id, accepted);
    if (!r.ok) return setError(r.fieldErrors?.declaration ?? r.error);
    refresh(); onDone();
  });
  return (
    <StepShell title="הצהרת מוכר פרטי" description="זה הלב של רק פרטי. ההצהרה נשמרת עם תאריך וגרסה, ומצורפת למודעה." onBack={onBack} onNext={submit} pending={pending} nextDisabled={!accepted}>
      <div className="rounded-lg border-2 border-primary/30 bg-primary-soft p-5">
        <div className="mb-3 flex items-center gap-2 text-primary"><ShieldCheck className="size-6" aria-hidden /><span className="font-bold">רכב קונים מאנשים. לא מסוחרים.</span></div>
        <div className="flex items-start gap-3">
          <Checkbox id="declaration" checked={accepted} onCheckedChange={(v) => setAccepted(v === true)} disabled={already} aria-describedby="declaration-text" />
          <label htmlFor="declaration" id="declaration-text" className="text-sm leading-relaxed font-medium">{PRIVATE_SELLER_DECLARATION_TEXT}</label>
        </div>
      </div>
      <ul className="list-disc space-y-1 ps-5 text-sm text-muted-foreground">
        <li>אסור לפרסם רכבים בשם מגרש, סוחר, חברת ליסינג או כל עסק למכירת רכבים.</li>
        <li>מותרות עד <span className="num">{data.limits.maxActive}</span> מודעות פעילות או ממתינות בו-זמנית לחשבון.</li>
        <li>חשבונות שמפרסמים רכבים רבים, מפרסמים את אותו רכב מחשבונות שונים או מתנהגים כסוחרים – ייבדקו ידנית ועלולים להיחסם.</li>
        <li>ניתן לקרוא את <Link href="/private-seller-policy" className="underline underline-offset-4" target="_blank">מדיניות המוכרים הפרטיים</Link> המלאה ואת <Link href="/terms" className="underline underline-offset-4" target="_blank">תנאי השימוש</Link>.</li>
      </ul>
      {already && <Badge variant="success">ההצהרה נרשמה למודעה זו</Badge>}
      <FormError message={error} />
    </StepShell>
  );
}

export { Sparkles, Search };
