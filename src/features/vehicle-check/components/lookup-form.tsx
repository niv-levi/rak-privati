"use client";
import * as React from "react";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field } from "@/components/ui/field";
import { Spinner } from "@/components/ui/spinner";
import { parsePlate } from "@/lib/vehicle/plate";

/** Submits to /vehicle-check?plate=… (server renders the report; URL carries only the input the user typed). */
export function LookupForm({ initial = "", compact = false, autoFocus }: { initial?: string; compact?: boolean; autoFocus?: boolean }) {
  const [value, setValue] = React.useState(initial);
  const [error, setError] = React.useState<string | null>(null);
  const [pending, start] = React.useTransition();
  const router = useRouter();

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = parsePlate(value);
    if (!parsed.ok) return setError(parsed.error);
    setError(null);
    start(() => router.push(`/vehicle-check?plate=${parsed.plate}`));
  };

  return (
    <form onSubmit={submit} className={compact ? "flex flex-col gap-3 sm:flex-row sm:items-end" : "space-y-4"} noValidate aria-label="בדיקת רכב לפי מספר רישוי">
      <Field id="plate" label="מספר רישוי" required error={error ?? undefined} description={compact ? undefined : "7 או 8 ספרות, ללא מקפים. המספר לא נשמר בכתובת הדף ואינו מוצג בפומבי."} className={compact ? "flex-1" : undefined}>
        <Input value={value} onChange={(e) => setValue(e.target.value)} inputMode="numeric" autoComplete="off" dir="ltr" placeholder="12-345-67" className="h-14 text-center text-2xl font-bold tracking-[0.25em] num" maxLength={11} autoFocus={autoFocus} />
      </Field>
      <Button type="submit" size="lg" className={compact ? "h-14" : "w-full h-14 text-base"} disabled={pending}>
        {pending ? <Spinner label="בודק" /> : <><Search aria-hidden /> בדיקת הרכב</>}
      </Button>
    </form>
  );
}
