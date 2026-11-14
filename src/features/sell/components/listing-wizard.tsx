"use client";
import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Check, Send } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/toast";
import { cn } from "@/lib/utils";
import { WIZARD_STEPS, type WizardStepKey } from "../schemas";
import { submitListingAction } from "../actions";
import type { WizardData } from "./wizard-types";
import { PlateStep, OfficialStep, VehicleStep, SaleStep, ConditionStep, ContactStep, DeclarationStep } from "./steps";
import { StepShell, FormError } from "./step-shell";
import { ImageUploader } from "./image-uploader";
import { ListingPreview } from "./listing-preview";
import { listingStatusLabels } from "@/lib/labels";

function stepComplete(key: WizardStepKey, d: WizardData, imageCount: number): boolean {
  const l = d.listing;
  switch (key) {
    case "plate": return !!l.plate_hash;
    case "official": return l.wizard_step >= 3 || !l.official_data;
    case "vehicle": return !!(l.make_id && l.model_id && l.year && l.mileage_km != null && l.ownership_count_declared && l.fuel_type && l.transmission);
    case "sale": return !!(l.price && l.city_id && l.condition);
    case "photos": return imageCount >= 3;
    case "condition": return !!l.description && l.accident_declared != null && l.body_repairs_declared != null;
    case "contact": return (l.contact_phone_opt_in || l.contact_whatsapp_opt_in) && !!d.profile.display_name;
    case "declaration": return !!l.declaration_id;
    case "preview": return false;
  }
}

export function ListingWizard({ data, initialPlate }: { data: WizardData; initialPlate?: string }) {
  const router = useRouter();
  const { push } = useToast();
  const [imageCount, setImageCount] = React.useState(data.images.length);
  const firstIncomplete = WIZARD_STEPS.findIndex((s) => !stepComplete(s.key, data, imageCount));
  const [step, setStep] = React.useState(Math.max(0, firstIncomplete === -1 ? WIZARD_STEPS.length - 1 : firstIncomplete));
  const [submitError, setSubmitError] = React.useState<string | null>(null);
  const [pending, start] = React.useTransition();
  const headingRef = React.useRef<HTMLDivElement>(null);
  const refresh = React.useCallback(() => router.refresh(), [router]);
  const go = (i: number) => { setStep(i); requestAnimationFrame(() => headingRef.current?.focus()); };
  const next = () => go(Math.min(WIZARD_STEPS.length - 1, step + 1));
  const back = () => go(Math.max(0, step - 1));
  const current = WIZARD_STEPS[step]!;
  const editable = ["draft", "needs_correction"].includes(data.listing.status);
  const allDone = WIZARD_STEPS.slice(0, -1).every((s) => stepComplete(s.key, data, imageCount));
  const limitReached = data.limits.counted >= data.limits.maxActive && editable;

  const submit = () => start(async () => {
    setSubmitError(null);
    const r = await submitListingAction(data.listing.id);
    if (!r.ok) return setSubmitError(r.error);
    push({ kind: "success", title: "המודעה נשלחה לבדיקה", description: "נעדכן אותך בהתראה כשהיא תאושר." });
    router.push("/account/listings?submitted=1");
  });

  const common = { data, refresh, onBack: back, onDone: next };

  return (
    <div className="grid gap-8 lg:grid-cols-[260px_1fr]">
      <nav aria-label="שלבי הפרסום" className="lg:sticky lg:top-24 lg:self-start">
        <ol className="flex gap-2 overflow-x-auto pb-2 scrollbar-none lg:flex-col lg:gap-1 lg:overflow-visible">
          {WIZARD_STEPS.map((s, i) => {
            const done = stepComplete(s.key, data, imageCount);
            const isCurrent = i === step;
            const reachable = i <= step || WIZARD_STEPS.slice(0, i).every((p) => stepComplete(p.key, data, imageCount));
            return (
              <li key={s.key} className="shrink-0">
                <button type="button" onClick={() => reachable && go(i)} disabled={!reachable} aria-current={isCurrent ? "step" : undefined}
                  className={cn("flex w-full items-center gap-3 rounded-md px-3 py-2 text-start text-sm transition-colors focus-visible:outline-2 focus-visible:outline-ring", isCurrent ? "bg-primary text-white" : done ? "text-brand-dark hover:bg-secondary" : "text-muted-foreground hover:bg-secondary disabled:hover:bg-transparent disabled:opacity-60")}>
                  <span aria-hidden className={cn("flex size-6 shrink-0 items-center justify-center rounded-full border text-xs font-bold num", isCurrent ? "border-white/60" : done ? "border-success bg-success text-white" : "border-border")}>{done && !isCurrent ? <Check className="size-3.5" /> : i + 1}</span>
                  <span className="whitespace-nowrap font-semibold">{s.title}</span>
                  {done && <span className="sr-only">(הושלם)</span>}
                </button>
              </li>
            );
          })}
        </ol>
      </nav>

      <div className="min-w-0 space-y-6">
        <div ref={headingRef} tabIndex={-1} className="flex flex-wrap items-center justify-between gap-2 outline-none">
          <p className="text-sm text-muted-foreground">שלב <span className="num">{step + 1}</span> מתוך <span className="num">{WIZARD_STEPS.length}</span></p>
          <Badge variant={data.listing.status === "draft" ? "muted" : "warning"}>{listingStatusLabels[data.listing.status]}</Badge>
        </div>
        {!editable && (
          <Alert variant="info">
            <AlertTitle>המודעה במצב &quot;{listingStatusLabels[data.listing.status]}&quot;</AlertTitle>
            <AlertDescription>ניתן לעדכן מחיר, תיאור ותמונות. שינוי פרטי הרכב דורש פנייה לתמיכה או פרסום מודעה חדשה.</AlertDescription>
          </Alert>
        )}
        {data.listing.status === "needs_correction" && data.listing.correction_notes && (
          <Alert variant="warning">
            <AlertTitle>צוות הבקרה ביקש תיקון</AlertTitle>
            <AlertDescription>{data.listing.correction_notes}</AlertDescription>
          </Alert>
        )}
        {limitReached && (
          <Alert variant="warning">
            <AlertTitle>הגעת למספר המודעות המרבי ({data.limits.maxActive})</AlertTitle>
            <AlertDescription>אפשר להמשיך לערוך את הטיוטה, אבל שליחתה לבדיקה תתאפשר רק אחרי שמודעה קיימת תסומן כנמכרה או תוסר. <Link href="/account/listings" className="font-semibold underline underline-offset-4">למודעות שלי</Link></AlertDescription>
          </Alert>
        )}

        <div className="rounded-lg border border-border bg-card p-5 shadow-card sm:p-8">
          {current.key === "plate" && <PlateStep {...common} onBack={undefined} initialPlate={initialPlate} />}
          {current.key === "official" && <OfficialStep {...common} />}
          {current.key === "vehicle" && <VehicleStep {...common} />}
          {current.key === "sale" && <SaleStep {...common} />}
          {current.key === "photos" && (
            <StepShell title="תמונות הרכב" description="לפחות 3 תמונות, עד 15. מומלץ: חזית, אחור, שני הצדדים, לוח מחוונים עם הקילומטראז׳, מושבים ותא מטען. אנחנו מסירים נתוני מיקום מהתמונות אוטומטית." onBack={back} onNext={next} nextDisabled={imageCount < 3}>
              <ImageUploader listingId={data.listing.id} initial={data.images} onChange={setImageCount} />
            </StepShell>
          )}
          {current.key === "condition" && <ConditionStep {...common} />}
          {current.key === "contact" && <ContactStep {...common} />}
          {current.key === "declaration" && <DeclarationStep {...common} />}
          {current.key === "preview" && (
            <StepShell title="כך תיראה המודעה" description="בדקו הכול לפני השליחה. אחרי האישור המודעה תופיע בלוח ותישלח התראה לקונים עם חיפושים שמורים מתאימים." onBack={back} hideNext
              extra={editable ? (
                <Button size="lg" onClick={submit} disabled={pending || !allDone || limitReached}><Send aria-hidden /> {pending ? "שולח…" : "שליחה לבדיקה"}</Button>
              ) : (
                <Link href={`/cars/${data.listing.id}`} className={buttonVariants({ size: "lg" })}>לצפייה במודעה</Link>
              )}>
              {!allDone && (
                <Alert variant="warning">
                  <AlertDescription>חסרים שלבים: {WIZARD_STEPS.slice(0, -1).filter((s) => !stepComplete(s.key, data, imageCount)).map((s) => s.title).join(", ")}.</AlertDescription>
                </Alert>
              )}
              <ListingPreview data={data} />
              <FormError message={submitError} />
            </StepShell>
          )}
        </div>
      </div>
    </div>
  );
}
