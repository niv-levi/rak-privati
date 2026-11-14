import Image from "next/image";
import Link from "next/link";
import { Car, Gauge, MapPin, Calendar, ShieldCheck, Phone } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { formatPrice, formatKm, formatRelativeDays } from "@/lib/format";
import { fuelLabels, transmissionLabels } from "@/lib/labels";
import { cn } from "@/lib/utils";
import type { ListingCard as ListingCardData } from "../queries/search";

export type ListingCardProps = {
  listing: ListingCardData & { cover_url: string | null };
  view?: "grid" | "list";
  priority?: boolean;
  actions?: React.ReactNode;
};

export function ListingCard({ listing: l, view = "grid", priority, actions }: ListingCardProps) {
  const title = [l.make_name, l.model_name].filter(Boolean).join(" ");
  const subtitle = [l.trim_name, l.year].filter(Boolean).join(" · ");
  const reduced = l.original_price != null && l.price != null && l.original_price > l.price;
  return (
    <article className={cn("group relative flex overflow-hidden rounded-lg border border-border bg-card shadow-card transition-shadow hover:shadow-card-hover focus-within:shadow-card-hover", view === "list" ? "flex-row" : "flex-col")}>
      <div className={cn("relative shrink-0 overflow-hidden bg-secondary", view === "list" ? "w-36 sm:w-56 aspect-[4/3]" : "aspect-[4/3] w-full")}>
        {l.cover_url ? (
          <Image src={l.cover_url} alt={l.cover_alt || `${title} ${l.year ?? ""}`} fill sizes={view === "list" ? "(max-width: 640px) 144px, 224px" : "(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"} className="object-cover transition-transform duration-300 group-hover:scale-[1.02]" priority={priority} unoptimized={l.cover_url.includes("token=")} />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-muted-foreground"><Car className="size-10" aria-hidden /><span className="sr-only">אין תמונה</span></div>
        )}
        {reduced && <Badge variant="accent" className="absolute start-3 top-3 shadow-sm">ירידת מחיר</Badge>}
      </div>
      <div className="flex flex-1 flex-col gap-2 p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="truncate text-base font-bold leading-tight">
              <Link href={`/cars/${l.id}`} className="after:absolute after:inset-0 focus-visible:outline-none">
                {title || "רכב"}
              </Link>
            </h3>
            {subtitle && <p className="truncate text-sm text-muted-foreground">{subtitle}</p>}
          </div>
          <p className="shrink-0 text-lg font-extrabold text-brand-dark num">{formatPrice(l.price)}</p>
        </div>
        <dl className="grid grid-cols-2 gap-x-3 gap-y-1 text-sm text-muted-foreground">
          <div className="flex items-center gap-1.5"><Calendar className="size-4" aria-hidden /><dt className="sr-only">שנה</dt><dd className="num">{l.year ?? "—"}</dd></div>
          <div className="flex items-center gap-1.5"><Gauge className="size-4" aria-hidden /><dt className="sr-only">קילומטראז׳ מוצהר</dt><dd className="num">{formatKm(l.mileage_km)}</dd></div>
          <div className="flex items-center gap-1.5 col-span-2"><MapPin className="size-4" aria-hidden /><dt className="sr-only">מיקום</dt><dd className="truncate">{l.city_name ?? l.district_name ?? "—"}{l.distance_km != null && <span className="num"> · {Math.round(l.distance_km)} ק״מ</span>}</dd></div>
        </dl>
        <div className="mt-auto flex flex-wrap items-center gap-1.5 pt-1">
          {l.fuel_type && <Badge variant="muted">{fuelLabels[l.fuel_type]}</Badge>}
          {l.transmission && <Badge variant="muted">{transmissionLabels[l.transmission]}</Badge>}
          <Badge variant="success" title="המוכר אימת מספר טלפון"><Phone aria-hidden /> טלפון מאומת</Badge>
          <Badge variant="secondary" title="המוכר הצהיר שהוא מוכר פרטי"><ShieldCheck aria-hidden /> הצהרת מוכר פרטי</Badge>
        </div>
        <p className="text-xs text-muted-foreground">{formatRelativeDays(l.published_at)}</p>
        {actions && <div className="relative z-10 flex gap-2 pt-1">{actions}</div>}
      </div>
    </article>
  );
}
