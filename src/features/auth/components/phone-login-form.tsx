"use client";
import * as React from "react";
import Link from "next/link";
import { useActionState } from "react";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field } from "@/components/ui/field";
import { Checkbox } from "@/components/ui/checkbox";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Spinner } from "@/components/ui/spinner";
import { sendOtpAction } from "../actions";
import type { ActionResult } from "@/lib/actions/result";

export function PhoneLoginForm({ next, disabled }: { next?: string; disabled?: boolean }) {
  const [state, action, pending] = useActionState<ActionResult | null, FormData>(sendOtpAction as never, null);
  const [accepted, setAccepted] = React.useState(false);
  const [marketing, setMarketing] = React.useState(false);
  const err = state && !state.ok ? state : null;

  return (
    <form action={action} className="space-y-5" noValidate>
      {next && <input type="hidden" name="next" value={next} />}
      {err && !err.fieldErrors && (
        <Alert variant="destructive">
          <AlertDescription>{err.error}</AlertDescription>
        </Alert>
      )}
      <Field id="phone" label="מספר טלפון נייד" required error={err?.fieldErrors?.phone} description="נשלח אליך קוד אימות חד-פעמי ב-SMS. המספר לא יוצג לאף אחד ללא אישורך.">
        <Input name="phone" type="tel" inputMode="tel" autoComplete="tel" dir="ltr" placeholder="050-1234567" className="text-start" disabled={disabled} required />
      </Field>
      <div className="space-y-3">
        <div className="flex items-start gap-3">
          <Checkbox id="acceptTerms" name="acceptTerms" checked={accepted} onCheckedChange={(v) => setAccepted(v === true)} aria-describedby={err?.fieldErrors?.acceptTerms ? "acceptTerms-err" : undefined} aria-invalid={!!err?.fieldErrors?.acceptTerms} disabled={disabled} />
          <label htmlFor="acceptTerms" className="text-sm leading-relaxed">
            קראתי ואני מסכים/ה ל
            <Link href="/terms" className="font-semibold text-primary underline underline-offset-4" target="_blank">
              תנאי השימוש
            </Link>{" "}
            ול
            <Link href="/privacy" className="font-semibold text-primary underline underline-offset-4" target="_blank">
              מדיניות הפרטיות
            </Link>
            .
          </label>
        </div>
        {err?.fieldErrors?.acceptTerms && (
          <p id="acceptTerms-err" role="alert" className="text-xs font-semibold text-destructive">
            {err.fieldErrors.acceptTerms}
          </p>
        )}
        <div className="flex items-start gap-3">
          <Checkbox id="marketing" name="marketing" checked={marketing} onCheckedChange={(v) => setMarketing(v === true)} disabled={disabled} />
          <label htmlFor="marketing" className="text-sm leading-relaxed text-muted-foreground">
            אני מעוניין/ת לקבל עדכונים שיווקיים מרק פרטי (לא חובה, ניתן לבטל בכל עת).
          </label>
        </div>
      </div>
      <Button type="submit" size="lg" className="w-full" disabled={pending || disabled}>
        {pending ? <Spinner label="שולח קוד" /> : <>שליחת קוד אימות <ArrowLeft aria-hidden /></>}
      </Button>
    </form>
  );
}
