"use client";
import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Field } from "@/components/ui/field";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useToast } from "@/components/ui/toast";
import { updateActiveListingAction } from "../actions";
import { ImageUploader } from "./image-uploader";
import type { WizardData } from "./wizard-types";
import { formatPrice } from "@/lib/format";

/** Limited editing for listings that already passed moderation: price, description, hours, photos. */
export function ActiveListingEditor({ data }: { data: WizardData }) {
  const l = data.listing;
  const [price, setPrice] = React.useState(String(l.price ?? ""));
  const [description, setDescription] = React.useState(l.description ?? "");
  const [hours, setHours] = React.useState(l.contact_hours ?? "");
  const [errors, setErrors] = React.useState<Record<string, string>>({});
  const [pending, start] = React.useTransition();
  const { push } = useToast();
  const router = useRouter();
  const save = (e: React.FormEvent) => {
    e.preventDefault();
    start(async () => {
      setErrors({});
      const r = await updateActiveListingAction(l.id, { price: Number(price), description, contact_hours: hours || null });
      if (!r.ok) { setErrors(r.fieldErrors ?? { form: r.error }); return push({ kind: "error", title: r.error }); }
      push({ kind: "success", title: r.message ?? "נשמר" });
      router.refresh();
    });
  };
  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card>
        <CardHeader><CardTitle>מחיר ותיאור</CardTitle><CardDescription>הורדת מחיר תישלח כהתראה למי ששמר את הרכב. מחיר נוכחי: <span className="num">{formatPrice(l.price)}</span></CardDescription></CardHeader>
        <CardContent>
          <form onSubmit={save} className="space-y-4" noValidate>
            <Field id="price" label="מחיר מבוקש (₪)" required error={errors.price}><Input type="number" inputMode="numeric" dir="ltr" className="num" value={price} onChange={(e) => setPrice(e.target.value)} min={1000} step={500} /></Field>
            <Field id="description" label="תיאור" required error={errors.description}><Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={8} maxLength={4000} /></Field>
            <Field id="hours" label="שעות נוחות ליצירת קשר" error={errors.contact_hours}><Input value={hours} onChange={(e) => setHours(e.target.value)} maxLength={120} /></Field>
            {errors.form && <p role="alert" className="text-sm font-semibold text-destructive">{errors.form}</p>}
            <div className="flex gap-3"><Button type="submit" disabled={pending}>{pending ? "שומר…" : "שמירת שינויים"}</Button><Link href={`/cars/${l.id}`} className={buttonVariants({ variant: "outline" })}>צפייה במודעה</Link></div>
          </form>
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle>תמונות</CardTitle><CardDescription>ניתן להוסיף, להסיר ולסדר תמונות. תמונות חדשות נבדקות אוטומטית מול תמונות של מודעות אחרות.</CardDescription></CardHeader>
        <CardContent><ImageUploader listingId={l.id} initial={data.images} /></CardContent>
      </Card>
    </div>
  );
}
