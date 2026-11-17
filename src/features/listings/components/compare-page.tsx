"use client";
import * as React from "react";
import Link from "next/link";
import { GitCompareArrows, X } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { Button, buttonVariants } from "@/components/ui/button";
import { useCompare } from "../compare-store";
import { fetchCompareAction, type CompareRow } from "../compare-actions";
import { formatKm, formatPrice, formatNumber } from "@/lib/format";
import { fuelLabels, transmissionLabels, ownershipLabels, bodyStyleLabels, conditionLabels } from "@/lib/labels";

export function ComparePageClient() {
  const { ids, remove, clear, hydrated } = useCompare();
  const [result, setResult] = React.useState<{ key: string; rows: CompareRow[] } | null>(null);
  const key = ids.join(",");
  React.useEffect(() => {
    if (!key) return;
    let alive = true;
    fetchCompareAction(key.split(",")).then((r) => { if (alive) setResult({ key, rows: r }); });
    return () => { alive = false; };
  }, [key]);
  const rows: CompareRow[] | null = !key ? [] : result?.key === key ? result.rows : null;
  const attrs: { label: string; get: (r: CompareRow) => React.ReactNode }[] = [
    { label: "מחיר", get: (r) => <span className="num font-bold">{formatPrice(r.price)}</span> },
    { label: "שנה", get: (r) => <span className="num">{r.year ?? "—"}</span> },
    { label: "קילומטראז׳ (מוצהר)", get: (r) => <span className="num">{formatKm(r.mileage_km)}</span> },
    { label: "נסועה בטסט האחרון", get: (r) => r.test_mileage_km != null ? <span className="num">{formatKm(r.test_mileage_km)}</span> : <span className="text-muted-foreground">לא זמין</span> },
    { label: "רמת גימור", get: (r) => r.trim_name ?? <span className="text-muted-foreground">—</span> },
    { label: "דלק", get: (r) => r.fuel_type ? fuelLabels[r.fuel_type] : "—" },
    { label: "תיבת הילוכים", get: (r) => r.transmission ? transmissionLabels[r.transmission] : "—" },
    { label: "נפח מנוע", get: (r) => r.engine_cc ? <span className="num">{formatNumber(r.engine_cc)} סמ״ק</span> : <span className="text-muted-foreground">—</span> },
    { label: "ידיים (הצהרה)", get: (r) => <span className="num">{r.ownership_count_declared ?? "—"}</span> },
    { label: "סוג בעלות", get: (r) => r.ownership_type ? ownershipLabels[r.ownership_type] : "—" },
    { label: "מרכב", get: (r) => r.body_style ? bodyStyleLabels[r.body_style] : "—" },
    { label: "מצב (הצהרה)", get: (r) => r.condition ? conditionLabels[r.condition] : "—" },
    { label: "מיקום", get: (r) => r.city_name ?? "—" },
    { label: "נתונים רשמיים", get: (r) => r.has_official_data ? "צורפו" : <span className="text-muted-foreground">לא צורפו</span> },
    { label: "תאונה (הצהרה)", get: (r) => r.accident_declared == null ? "לא צוין" : r.accident_declared ? "כן" : "לא" },
  ];
  return (
    <div className="container-page pb-16">
      <PageHeader title="השוואת רכבים" description="עד שלושה רכבים זה לצד זה. ערכים חסרים מסומנים במפורש." actions={ids.length > 0 && <Button variant="outline" onClick={clear}>ניקוי ההשוואה</Button>} />
      {!hydrated || rows === null ? <p className="text-sm text-muted-foreground">טוען…</p> : rows.length === 0 ? (
        <EmptyState icon={<GitCompareArrows />} title="אין רכבים להשוואה" description="בעמוד של כל מודעה לחצו על ״השוואה״ כדי להוסיף אותה לכאן (עד 3)." action={<Link href="/cars" className={buttonVariants()}>לחיפוש רכב</Link>} />
      ) : (
        <div className="overflow-x-auto rounded-lg border border-border bg-card">
          <table className="w-full min-w-[640px] text-sm">
            <caption className="sr-only">טבלת השוואה בין הרכבים שנבחרו</caption>
            <thead>
              <tr className="border-b border-border">
                <th scope="col" className="p-3 text-start text-muted-foreground font-semibold">מאפיין</th>
                {rows.map((r) => (
                  <th key={r.id} scope="col" className="p-3 text-start align-top">
                    <Link href={`/cars/${r.id}`} className="font-bold hover:underline underline-offset-4">{r.make_name} {r.model_name}</Link>
                    <button type="button" onClick={() => remove(r.id)} className="ms-2 inline-flex rounded-sm p-0.5 text-muted-foreground hover:text-destructive" aria-label={`הסרת ${r.make_name} ${r.model_name} מההשוואה`}><X className="size-4" aria-hidden /></button>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {attrs.map((a) => (
                <tr key={a.label} className="border-b border-border last:border-0 odd:bg-secondary/30">
                  <th scope="row" className="p-3 text-start font-semibold text-muted-foreground">{a.label}</th>
                  {rows.map((r) => <td key={r.id} className="p-3">{a.get(r)}</td>)}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
