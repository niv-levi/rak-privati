"use client";
import { useActionState } from "react";
import { Input } from "@/components/ui/input";
import { Field } from "@/components/ui/field";
import { Button } from "@/components/ui/button";
import { deleteAccountAction } from "../actions";
import type { ActionResult } from "@/lib/actions/result";

export function DeleteAccountForm() {
  const [state, action, pending] = useActionState<ActionResult | null, FormData>(deleteAccountAction as never, null);
  const err = state && !state.ok ? state : null;
  return (
    <form action={action} className="space-y-4" noValidate>
      <Field id="confirm" label="לאישור, הקלידו את המילה: מחיקה" required error={err?.fieldErrors?.confirm}><Input name="confirm" autoComplete="off" className="max-w-xs" /></Field>
      {err && !err.fieldErrors && <p role="alert" className="text-sm font-semibold text-destructive">{err.error}</p>}
      <Button type="submit" variant="destructive" disabled={pending}>{pending ? "מוחק…" : "מחיקת החשבון לצמיתות"}</Button>
    </form>
  );
}
