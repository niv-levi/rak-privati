"use client";
import { Phone, ShieldCheck, MapPin, Gauge, Calendar } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Gallery } from "@/features/listings/components/detail/gallery";
import { SpecSheet } from "@/features/listings/components/detail/spec-sheet";
import { formatKm, formatPrice } from "@/lib/format";
import type { WizardData } from "./wizard-types";
import type { VehicleReport } from "@/lib/providers/types";

/** Client-side preview that mirrors the public detail page layout using wizard data. */
export function ListingPreview({ data }: { data: WizardData }) {
  const l = data.listing;
  const title = [l.make_name, l.model_name, l.trim_name, l.year].filter(Boolean).join(" ") || "הרכב שלך";
  const city = data.cities.find((c) => c.id === l.city_id);
  const report = l.official_data as unknown as VehicleReport | null;
  return (
    <div className="space-y-6 rounded-lg border border-dashed border-border p-4">
      <Gallery images={data.images.filter((i) => i.url).map((i) => ({ id: i.id, url: i.url!, alt: i.alt_text }))} title={title} />
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-2xl font-extrabold">{title}</h3>
          <p className="mt-1 flex flex-wrap gap-x-4 text-sm text-muted-foreground">
            {l.year && <span className="flex items-center gap-1"><Calendar className="size-4" aria-hidden /><span className="num">{l.year}</span></span>}
            <span className="flex items-center gap-1"><Gauge className="size-4" aria-hidden /><span className="num">{formatKm(l.mileage_km)}</span></span>
            <span className="flex items-center gap-1"><MapPin className="size-4" aria-hidden />{city?.name_he ?? "—"}</span>
          </p>
        </div>
        <p className="text-3xl font-extrabold text-brand-dark num">{formatPrice(l.price)}</p>
      </div>
      <div className="flex flex-wrap gap-2">
        <Badge variant="success"><Phone aria-hidden /> טלפון מאומת</Badge>
        <Badge variant="secondary"><ShieldCheck aria-hidden /> המוכר הצהיר שהוא מוכר פרטי</Badge>
      </div>
      <Card>
        <CardHeader><CardTitle>פרטי הרכב</CardTitle></CardHeader>
        <CardContent><SpecSheet data={{ ...l, equipment: l.equipment ?? [], official_ownership_type: report?.registration.ownershipType.value ?? null }} /></CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle>תיאור</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <p className="whitespace-pre-line leading-relaxed">{l.description || "—"}</p>
          <p className="text-sm text-muted-foreground">תאונה: {l.accident_declared == null ? "לא צוין" : l.accident_declared ? `כן – ${l.accident_details ?? ""}` : "לא"} · פחחות: {l.body_repairs_declared == null ? "לא צוין" : l.body_repairs_declared ? `כן – ${l.body_repair_details ?? ""}` : "לא"}</p>
        </CardContent>
      </Card>
      <p className="text-sm text-muted-foreground">יצירת קשר: {[l.contact_phone_opt_in && "טלפון", l.contact_whatsapp_opt_in && "WhatsApp"].filter(Boolean).join(" ו-") || "לא נבחר ערוץ"} · מוצג כ-<strong>{data.profile.display_name ?? "—"}</strong></p>
    </div>
  );
}
