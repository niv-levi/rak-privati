"use client";
import * as React from "react";
import { useActionState } from "react";
import { Input } from "@/components/ui/input";
import { Field } from "@/components/ui/field";
import { Button } from "@/components/ui/button";
import { CityCombobox, type CityItem } from "@/components/shared/city-combobox";
import { updateProfileAction } from "../actions";
import type { ActionResult } from "@/lib/actions/result";

export function ProfileForm({ initial, cities }: { initial: { display_name: string; city_id: string }; cities: CityItem[] }) {
  const [state, action, pending] = useActionState<ActionResult | null, FormData>(updateProfileAction as never, null);
  const [cityId, setCityId] = React.useState(initial.city_id);
  const err = state && !state.ok ? state : null;
  return (
    <form action={action} className="space-y-4" noValidate>
      <Field id="display_name" label="שם לתצוגה" required error={err?.fieldErrors?.display_name}><Input name="display_name" defaultValue={initial.display_name} maxLength={60} autoComplete="given-name" /></Field>
      <Field id="city_id" label="עיר מגורים" error={err?.fieldErrors?.city_id}>
        <CityCombobox id="city_id" cities={cities} value={cityId || null} onChange={(id) => setCityId(id ?? "")} />
      </Field>
      <input type="hidden" name="city_id" value={cityId} />
      {state?.ok && <p role="status" className="text-sm font-semibold text-success">{state.message}</p>}
      {err && !err.fieldErrors && <p role="alert" className="text-sm font-semibold text-destructive">{err.error}</p>}
      <Button type="submit" disabled={pending}>{pending ? "שומר…" : "שמירה"}</Button>
    </form>
  );
}
