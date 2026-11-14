import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { MapPin, Calendar, Gauge, Phone, ShieldCheck, Pencil, TrendingDown, AlertCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { buttonVariants } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { getListingDetail } from "@/features/listings/queries/detail";
import { searchListings } from "@/features/listings/queries/search";
import { parseSearchParams } from "@/features/listings/search-params";
import { Gallery } from "@/features/listings/components/detail/gallery";
import { SpecSheet } from "@/features/listings/components/detail/spec-sheet";
import { ContactPanel } from "@/features/listings/components/detail/contact-panel";
import { FavoriteButton, ShareButton, CompareButton, ReportDialog } from "@/features/listings/components/detail/listing-actions";
import { OfficialDataCard } from "@/features/listings/components/detail/official-data-card";
import { ViewTracker } from "@/features/listings/components/detail/view-tracker";
import { ListingGrid } from "@/features/listings/components/listing-grid";
import { PriceContext } from "@/features/valuation/components/price-context";
import { runValuation } from "@/features/valuation/engine";
import { formatPrice, formatKm, formatRelativeDays, formatDate } from "@/lib/format";
import { listingStatusLabels } from "@/lib/labels";
import { siteConfig } from "@/lib/config/site";

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const d = await getListingDetail(id);
  if (!d || d.listing.status !== "active") return { title: "המודעה אינה זמינה", robots: { index: false } };
  const l = d.listing;
  const title = `${l.make_name ?? ""} ${l.model_name ?? ""} ${l.year ?? ""} למכירה ממוכר פרטי`.replace(/\s+/g, " ").trim();
  const description = `${l.make_name} ${l.model_name}${l.trim_name ? " " + l.trim_name : ""} ${l.year}, ${formatKm(l.mileage_km)}, ${formatPrice(l.price)}, ${d.city?.name_he ?? ""}. מודעה ממוכר פרטי בלבד ברק פרטי.`;
  return {
    title,
    description,
    alternates: { canonical: `/cars/${id}` },
    openGraph: { title, description, type: "website", url: `${siteConfig.url}/cars/${id}`, images: d.images[0] ? [{ url: d.images[0].url, alt: d.images[0].alt ?? title }] : undefined },
    twitter: { card: d.images[0] ? "summary_large_image" : "summary", title, description },
  };
}

export default async function ListingPage({ params }: Props) {
  const { id } = await params;
  const d = await getListingDetail(id);
  if (!d) notFound();
  const { listing: l, images, seller } = d;
  const isPublic = l.status === "active";
  if (!isPublic && !d.isOwner) {
    // Staff see it through /admin; everyone else gets 404 (no information leak about pending listings)
    notFound();
  }
  const title = [l.make_name, l.model_name].filter(Boolean).join(" ") || "רכב";
  const fullTitle = `${title}${l.trim_name ? " " + l.trim_name : ""}${l.year ? " " + l.year : ""}`;
  const reduced = l.original_price != null && l.price != null && l.original_price > l.price;

  const [valuation, similar] = await Promise.all([
    l.model_id && l.year && isPublic ? runValuation({ model_id: l.model_id, year: l.year, mileage_km: l.mileage_km, exclude_listing_id: l.id, asking_price: l.price, ownership_count: l.ownership_count_declared, ownership_type: l.ownership_type, known_damage: l.accident_declared }) : Promise.resolve(null),
    l.model_id && isPublic ? searchListings({ ...parseSearchParams({}), model: [l.model_id], page: 1 }, 7) : Promise.resolve(null),
  ]);
  const similarItems = (similar?.items ?? []).filter((s) => s.id !== l.id).slice(0, 6);

  const jsonLd = isPublic
    ? {
        "@context": "https://schema.org",
        "@type": "Product",
        name: fullTitle,
        description: l.description ?? undefined,
        image: images.map((i) => i.url),
        brand: l.make_name ? { "@type": "Brand", name: l.make_name } : undefined,
        model: l.model_name ?? undefined,
        offers: { "@type": "Offer", price: l.price, priceCurrency: "ILS", availability: "https://schema.org/InStock", itemCondition: "https://schema.org/UsedCondition", url: `${siteConfig.url}/cars/${l.id}`, seller: { "@type": "Person", name: seller?.display_name ?? "מוכר פרטי" } },
        additionalProperty: [
          l.year ? { "@type": "PropertyValue", name: "שנת ייצור", value: l.year } : null,
          l.mileage_km != null ? { "@type": "PropertyValue", name: "קילומטראז׳ מוצהר", value: l.mileage_km, unitCode: "KMT" } : null,
        ].filter(Boolean),
      }
    : null;

  return (
    <div className="container-page pb-16 pt-6">
      {isPublic && <ViewTracker listingId={l.id} />}
      {jsonLd && <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />}
      {!isPublic && (
        <Alert variant="warning" className="mb-6">
          <AlertTitle>תצוגה פרטית – סטטוס: {listingStatusLabels[l.status]}</AlertTitle>
          <AlertDescription>רק את/ה רואה את העמוד הזה. {l.status === "pending_review" ? "המודעה ממתינה לבדיקת צוות הבקרה." : l.status === "needs_correction" ? `נדרש תיקון: ${l.correction_notes ?? ""}` : l.status === "rejected" ? `המודעה נדחתה: ${l.rejection_reason ?? ""}` : ""} <Link href={`/account/listings/${l.id}/edit`} className="font-semibold underline underline-offset-4">לעריכה</Link></AlertDescription>
        </Alert>
      )}
      <nav aria-label="פירורי לחם" className="mb-4 text-sm text-muted-foreground">
        <ol className="flex flex-wrap items-center gap-1">
          <li><Link href="/cars" className="hover:underline">חיפוש רכב</Link></li>
          {l.make_id && <li className="flex items-center gap-1"><span aria-hidden>/</span><Link href={`/cars?make=${l.make_id}`} className="hover:underline">{l.make_name}</Link></li>}
          {l.model_id && <li className="flex items-center gap-1"><span aria-hidden>/</span><Link href={`/cars?make=${l.make_id}&model=${l.model_id}`} className="hover:underline">{l.model_name}</Link></li>}
        </ol>
      </nav>

      <div className="grid gap-8 lg:grid-cols-[1fr_380px]">
        <div className="space-y-8 min-w-0">
          <Gallery images={images} title={fullTitle} />

          <header className="space-y-3">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h1 className="text-h1 font-extrabold">{fullTitle}</h1>
                <p className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
                  {l.year && <span className="flex items-center gap-1"><Calendar className="size-4" aria-hidden /><span className="num">{l.year}</span></span>}
                  <span className="flex items-center gap-1"><Gauge className="size-4" aria-hidden /><span className="num">{formatKm(l.mileage_km)}</span></span>
                  <span className="flex items-center gap-1"><MapPin className="size-4" aria-hidden />{d.city?.name_he ?? "—"}{d.city?.district_name ? `, ${d.city.district_name.replace("מחוז ", "")}` : ""}</span>
                  <span>{formatRelativeDays(l.published_at ?? l.created_at)}</span>
                </p>
              </div>
              <div className="text-end">
                <p className="text-3xl font-extrabold text-brand-dark num">{formatPrice(l.price)}</p>
                {reduced && <p className="flex items-center justify-end gap-1 text-sm text-success"><TrendingDown className="size-4" aria-hidden /> ירד מ-<span className="num line-through">{formatPrice(l.original_price)}</span></p>}
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Badge variant="success"><Phone aria-hidden /> טלפון מאומת</Badge>
              <Badge variant="secondary"><ShieldCheck aria-hidden /> המוכר הצהיר שהוא מוכר פרטי</Badge>
              {l.ownership_count_declared === 1 && <Badge variant="accent">יד ראשונה (הצהרת המוכר)</Badge>}
            </div>
            {isPublic && (
              <div className="flex flex-wrap gap-2 pt-1">
                <FavoriteButton listingId={l.id} initial={d.isFavorite} loggedIn={!!d.viewerId} />
                <ShareButton title={fullTitle} url={`${siteConfig.url}/cars/${l.id}`} />
                <CompareButton listingId={l.id} />
                <ReportDialog listingId={l.id} />
              </div>
            )}
          </header>

          {valuation && <PriceContext valuation={valuation} askingPrice={l.price} compact />}

          <Card>
            <CardHeader><CardTitle as="h2">פרטי הרכב</CardTitle></CardHeader>
            <CardContent>
              <SpecSheet data={{ ...l, equipment: l.equipment ?? [], official_ownership_type: d.officialReport?.registration.ownershipType.value ?? null }} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle as="h2">תיאור המוכר</CardTitle></CardHeader>
            <CardContent className="space-y-6">
              <p className="whitespace-pre-line leading-relaxed">{l.description || "המוכר לא הוסיף תיאור."}</p>
              <Separator />
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <h3 className="text-sm font-bold">היסטוריית טיפולים</h3>
                  <p className="mt-1 text-sm text-muted-foreground whitespace-pre-line">{l.maintenance_history || "לא צוין"}</p>
                </div>
                <div>
                  <h3 className="text-sm font-bold">תאונות ותיקוני פחחות (הצהרת המוכר)</h3>
                  <ul className="mt-1 space-y-1 text-sm text-muted-foreground">
                    <li>תאונה: {l.accident_declared == null ? "לא צוין" : l.accident_declared ? <>כן – {l.accident_details || "ללא פירוט"}</> : "המוכר הצהיר שלא"}</li>
                    <li>תיקוני פחחות: {l.body_repairs_declared == null ? "לא צוין" : l.body_repairs_declared ? <>כן – {l.body_repair_details || "ללא פירוט"}</> : "המוכר הצהיר שלא"}</li>
                  </ul>
                </div>
              </div>
              <p className="flex items-start gap-2 text-xs text-muted-foreground"><AlertCircle className="size-4 shrink-0" aria-hidden /> ההצהרות לעיל הן של המוכר בלבד ואינן מאומתות על ידי רק פרטי. מומלץ לבצע בדיקה במכון מורשה לפני רכישה.</p>
            </CardContent>
          </Card>

          <OfficialDataCard report={d.officialReport} fetchedAt={l.official_data_fetched_at} discrepancyNotes={l.discrepancy_notes} plateMasked={l.plate_masked} />

          {d.priceHistory.length > 0 && (
            <Card>
              <CardHeader><CardTitle as="h2" className="text-base">היסטוריית מחיר במודעה</CardTitle></CardHeader>
              <CardContent>
                <ul className="divide-y divide-border text-sm">
                  {d.priceHistory.map((h, i) => <li key={i} className="flex justify-between py-2"><span className="num text-muted-foreground">{formatDate(h.changed_at)}</span><span className="num"><span className="line-through text-muted-foreground">{formatPrice(h.old_price)}</span> ← {formatPrice(h.new_price)}</span></li>)}
                </ul>
              </CardContent>
            </Card>
          )}
        </div>

        <aside className="space-y-4 lg:sticky lg:top-24 lg:self-start">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle as="h2" className="text-base">המוכר</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="flex size-12 items-center justify-center rounded-full bg-secondary text-lg font-bold text-primary" aria-hidden>{(seller?.display_name ?? "מ").slice(0, 1)}</div>
                <div>
                  <p className="font-bold">{seller?.display_name ?? "מוכר פרטי"}</p>
                  <p className="text-xs text-muted-foreground">חבר/ה מאז <span className="num">{seller ? formatDate(seller.member_since) : "—"}</span>{seller && seller.active_listings > 1 && <> · <span className="num">{seller.active_listings}</span> מודעות פעילות</>}</p>
                </div>
              </div>
              <ul className="space-y-1.5 text-sm">
                <li className="flex items-center gap-2"><Phone className="size-4 text-success" aria-hidden /> טלפון מאומת</li>
                <li className="flex items-center gap-2"><ShieldCheck className="size-4 text-primary" aria-hidden /> הצהיר/ה שהוא/היא מוכר/ת פרטי/ת</li>
              </ul>
              <p className="text-xs text-muted-foreground">אימות טלפון אינו אימות זהות או בעלות על הרכב.</p>
              <Separator />
              <ContactPanel listingId={l.id} phoneOptIn={l.contact_phone_opt_in} whatsappOptIn={l.contact_whatsapp_opt_in} contactHours={l.contact_hours} loggedIn={!!d.viewerId} isOwner={d.isOwner} preview={!isPublic} vehicleTitle={fullTitle} />
              {d.isOwner && <Link href={`/account/listings/${l.id}/edit`} className={buttonVariants({ variant: "outline", className: "w-full" })}><Pencil aria-hidden /> עריכת המודעה</Link>}
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-5 text-sm space-y-2">
              <h2 className="font-bold">טיפים לקנייה בטוחה</h2>
              <ul className="list-disc space-y-1 ps-5 text-muted-foreground">
                <li>בקשו את מספר הרישוי המלא ובצעו <Link href="/vehicle-check" className="underline underline-offset-4">בדיקת רכב</Link>.</li>
                <li>בדקו במכון בדיקה מורשה לפני התשלום.</li>
                <li>העברת בעלות מתבצעת רק מול רישיון הרכב ותעודת הזהות של הבעלים.</li>
                <li>נתקלתם בסוחר שמתחזה לפרטי? <span className="font-semibold">דווחו לנו.</span></li>
              </ul>
            </CardContent>
          </Card>
        </aside>
      </div>

      {similarItems.length > 0 && (
        <section className="mt-14 space-y-4" aria-labelledby="similar-heading">
          <div className="flex items-center justify-between">
            <h2 id="similar-heading" className="text-h2 font-extrabold">רכבים דומים ממוכרים פרטיים</h2>
            <Link href={`/cars?make=${l.make_id}&model=${l.model_id}`} className="text-sm font-semibold text-primary underline-offset-4 hover:underline">לכל ה{l.model_name}</Link>
          </div>
          <Suspense><ListingGrid listings={similarItems} priorityCount={0} /></Suspense>
        </section>
      )}
    </div>
  );
}
