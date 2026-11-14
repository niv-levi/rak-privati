"use client";
import * as React from "react";
import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field } from "@/components/ui/field";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Spinner } from "@/components/ui/spinner";
import { verifyOtpAction, resendOtpAction } from "../actions";
import type { ActionResult } from "@/lib/actions/result";

export function OtpForm({ maskedPhone }: { maskedPhone: string }) {
  const [state, action, pending] = useActionState<ActionResult | null, FormData>(verifyOtpAction as never, null);
  const [cooldown, setCooldown] = React.useState(45);
  const [resendMsg, setResendMsg] = React.useState<string | null>(null);
  const [resending, startResend] = React.useTransition();
  const err = state && !state.ok ? state : null;

  React.useEffect(() => {
    if (cooldown <= 0) return;
    const t = setInterval(() => setCooldown((c) => c - 1), 1000);
    return () => clearInterval(t);
  }, [cooldown]);

  return (
    <form action={action} className="space-y-5" noValidate>
      <p className="text-sm text-muted-foreground">
        שלחנו קוד בן 6 ספרות למספר <span className="num font-semibold text-foreground">{maskedPhone}</span>.
      </p>
      {err && !err.fieldErrors && (
        <Alert variant="destructive">
          <AlertDescription>{err.error}</AlertDescription>
        </Alert>
      )}
      <Field id="code" label="קוד אימות" required error={err?.fieldErrors?.code}>
        <Input name="code" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" maxLength={6} dir="ltr" className="text-center text-2xl tracking-[0.5em] font-bold h-14" autoFocus required />
      </Field>
      <Button type="submit" size="lg" className="w-full" disabled={pending}>
        {pending ? <Spinner label="מאמת" /> : "אימות וכניסה"}
      </Button>
      <div className="flex items-center justify-between text-sm">
        <button
          type="button"
          disabled={cooldown > 0 || resending}
          onClick={() =>
            startResend(async () => {
              const r = await resendOtpAction();
              setResendMsg(r.ok ? (r.message ?? "קוד חדש נשלח") : r.error);
              if (r.ok) setCooldown(45);
            })
          }
          className="font-semibold text-primary underline-offset-4 hover:underline disabled:no-underline disabled:text-muted-foreground"
        >
          {cooldown > 0 ? <>שליחה חוזרת בעוד <span className="num">{cooldown}</span> שניות</> : "לא קיבלתי קוד – שלחו שוב"}
        </button>
        <a href="/login" className="text-muted-foreground hover:text-foreground underline-offset-4 hover:underline">
          החלפת מספר
        </a>
      </div>
      {resendMsg && (
        <p role="status" className="text-sm text-muted-foreground">
          {resendMsg}
        </p>
      )}
    </form>
  );
}
