import type { Metadata } from "next";
import { Suspense } from "react";
import { SearchX } from "lucide-react";
import { Pagination } from "@/components/ui/pagination";
import { EmptyState } from "@/components/ui/empty-state";
import { buttonVariants } from "@/components/ui/button";
import Link from "next/link";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { searchListings } from "@/features/listings/queries/search";
import { getGeo, getMakes, getModels } from "@/features/listings/queries/catalog";
import { parseSearchParams, filtersToQuery, countActiveFilters } from "@/features/listings/search-params";
import { SearchFilters } from "@/features/listings/components/search-filters";
import { ResultsToolbar } from "@/features/listings/components/results-toolbar";
import { ListingGrid } from "@/features/listings/components/listing-grid";
import { ActiveFilterChips } from "@/features/listings/components/active-filter-chips";
import { getCurrentUser } from "@/lib/supabase/server";
import { track } from "@/lib/analytics/track";

export const metadata: Metadata = {
  title: "חיפוש רכב ממוכרים פרטיים",
  description: "חיפוש רכבים יד שנייה ממוכרים פרטיים בלבד – ללא סוחרים וללא מגרשים. סינון לפי יצרן, דגם, מחיר, שנה, קילומטראז׳ ומיקום.",
  alternates: { canonical: "/cars" },
};

export default async function CarsPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sp = await searchParams;
  const filters = parseSearchParams(sp);
  const [result, makes, models, geo, user] = await Promise.all([searchListings(filters), getMakes(), getModels(), getGeo(), getCurrentUser()]);
  if (countActiveFilters(filters) > 0) void track("search_performed", { filters: countActiveFilters(filters), sort: filters.sort, results: result.total }, user?.id);
  const names = { makes, models, districts: geo.districts, cities: geo.cities };

  return (
    <div className="container-page py-6 sm:py-8">
      <div className="mb-6 space-y-2">
        <h1 className="text-h1 font-extrabold">רכבים ממוכרים פרטיים</h1>
        <p className="text-muted-foreground">כל המודעות כאן פורסמו על ידי אנשים פרטיים שהצהירו שהם לא סוחרים, ועברו בדיקה לפני פרסום.</p>
      </div>
      <div className="grid gap-6 lg:grid-cols-[300px_1fr]">
        <SearchFilters filters={filters} makes={makes} models={models} districts={geo.districts} cities={geo.cities} />
        <section aria-labelledby="results-heading" className="space-y-4 min-w-0">
          <h2 id="results-heading" className="sr-only">תוצאות</h2>
          <ResultsToolbar filters={filters} total={result.total} loggedIn={!!user} />
          <ActiveFilterChips filters={filters} names={names} />
          {!result.available && (
            <Alert variant="warning">
              <AlertDescription>לא ניתן לטעון תוצאות כרגע. בסביבה ללא חיבור למסד הנתונים הלוח מוצג ריק.</AlertDescription>
            </Alert>
          )}
          {result.items.length === 0 ? (
            <EmptyState
              icon={<SearchX />}
              title={countActiveFilters(filters) > 0 ? "לא נמצאו רכבים שמתאימים לסינון" : "עדיין אין מודעות פעילות"}
              description={
                countActiveFilters(filters) > 0
                  ? "נסו להרחיב את טווח המחיר או השנים, להסיר מסננים, או לשמור את החיפוש כדי לקבל התראה כשיתפרסם רכב מתאים."
                  : "הלוח חדש וממתין למוכרים הפרטיים הראשונים. אפשר לפרסם רכב, לבדוק רכב לפי מספר רישוי או לשמור חיפוש ולקבל התראה."
              }
              action={
                <>
                  {countActiveFilters(filters) > 0 && <Link href="/cars" className={buttonVariants({ variant: "outline" })}>ניקוי מסננים</Link>}
                  {filters.price_max && <Link href={`/cars${filtersToQuery({ ...filters, price_max: Math.round(filters.price_max * 1.2) })}`} className={buttonVariants({ variant: "outline" })}>הרחבת מחיר ב-20%</Link>}
                  <Link href="/sell" className={buttonVariants({ variant: "accent" })}>פרסום רכב</Link>
                </>
              }
            />
          ) : (
            <Suspense>
              <ListingGrid listings={result.items} view={filters.view} />
            </Suspense>
          )}
          <Pagination page={result.page} totalPages={result.totalPages} hrefFor={(p) => `/cars${filtersToQuery({ ...filters, page: p })}`} className="pt-4" />
        </section>
      </div>
    </div>
  );
}
