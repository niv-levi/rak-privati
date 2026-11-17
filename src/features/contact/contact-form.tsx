"use client";
import { useActionState } from "react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Field } from "@/components/ui/field";
import { NativeSelect } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { sendContactMessageAction } from "./actions";
import type { ActionResult } from "@/lib/actions/result";

const topics = [{ v: "support", l: "תמיכה ושאלות" }, { v: "report_dealer", l: "דיווח על סוחר" }, { v: "accessibility", l: "נגישות" }, { v: "privacy", l: "פרטיות ומידע אישי" }, { v: "legal", l: "פנייה משפטית / זכויות יוצרים" }, { v: "other", l: "אחר" }];

export function ContactForm({ initialTopic, disabled }: { initialTopic?: string; disabled?: boolean }) {
  const [state, action, pending] = useActionState<ActionResult | null, FormData>(sendContactMessageAction as never, null);
  const err = state && !state.ok ? state : null;
  if (state?.ok) return <Alert variant="success"><AlertDescription>{state.message}</AlertDescription></Alert>;
  return (
    <form action={action} className="space-y-4" noValidate>
      <Field id="topic" label="נושא" required><NativeSelect name="topic" defaultValue={topics.some((t) => t.v === initialTopic) ? initialTopic : "support"}>{topics.map((t) => <option key={t.v} value={t.v}>{t.l}</option>)}</NativeSelect></Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field id="name" label="שם"><Input name="name" autoComplete="name" maxLength={80} /></Field>
        <Field id="email" label="דוא״ל" error={err?.fieldErrors?.email}><Input name="email" type="email" autoComplete="email" dir="ltr" maxLength={160} /></Field>
        <Field id="phone" label="טלפון"><Input name="phone" type="tel" autoComplete="tel" dir="ltr" maxLength={20} /></Field>
      </div>
      <Field id="message" label="ההודעה" required error={err?.fieldErrors?.message}><Textarea name="message" rows={6} minLength={10} maxLength={4000} /></Field>
      <div className="hidden" aria-hidden><label>אתר<input name="website" tabIndex={-1} autoComplete="off" /></label></div>
      {err && !err.fieldErrors && <Alert variant="destructive"><AlertDescription>{err.error}</AlertDescription></Alert>}
      <Button type="submit" disabled={pending || disabled}>{pending ? "שולח…" : "שליחה"}</Button>
    </form>
  );
}
