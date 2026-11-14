import { Scale, Info } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatPrice } from "@/lib/format";
import type { ValuationResult } from "../engine";
import { cn } from "@/lib/utils";

const confidenceLabel = { none: "ללא", low: "נמוכה", medium: "בינונית", high: "גבוהה" } as const;

/** Range bar comparing an asking price to asking prices of similar listings. */
export function PriceContext({ valuation, askingPrice, compact }: { valuation: ValuationResult; askingPrice: number | null; compact?: boolean }) {
  const internal = valuation.sources.find((s) => s.key === "internal_listings");
  if (!internal) return null;
  if (internal.status !== "ok" || !internal.low || !internal.high || !internal.mid) {
    if (compact) {
      return (
        <p className="flex items-start gap-2 rounded-md border border-border bg-card p-3 text-xs text-muted-foreground">
          <Info className="size-4 shrink-0" aria-hidden />
          אין עדיין מספיק מודעות דומות ברק פרטי כדי להציג השוואת מחיר אמינה ({internal.comparableCount} נמצאו, נדרשות לפחות {internal.limitations.at(-1)?.match(/\d+/)?.[0] ?? 5}). לא נציג הערכה מטעה.
        </p>
      );
    }
    return null;
  }
  const span = Math.max(1, internal.high - internal.low);
  const pos = askingPrice != null ? Math.min(100, Math.max(0, ((askingPrice - internal.low) / span) * 100)) : null;
  const ctx = valuation.askingPriceContext;
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle as="h2" className="flex items-center gap-2 text-base"><Scale className="size-5 text-primary" aria-hidden /> {internal.label}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="relative pt-6">
          <div className="h-2 w-full rounded-full bg-gradient-to-l from-success/40 via-secondary to-warning/40" />
          {pos != null && (
            <div className="absolute top-0" style={{ insetInlineStart: `calc(${pos}% - 10px)` }}>
              <span className="block size-5 rounded-full border-2 border-white bg-brand-dark shadow" aria-hidden />
            </div>
          )}
          <div className="mt-2 flex justify-between text-xs text-muted-foreground num"><span>{formatPrice(internal.low)}</span><span className="font-semibold text-foreground">חציון {formatPrice(internal.mid)}</span><span>{formatPrice(internal.high)}</span></div>
        </div>
        <div className="flex flex-wrap items-center gap-2 text-sm">
          {ctx && askingPrice != null && (
            <span className={cn("font-semibold", ctx.position === "below" ? "text-success" : ctx.position === "above" ? "text-warning" : "text-foreground")}>
              {ctx.position === "within" ? "המחיר המבוקש בתוך הטווח" : ctx.position === "below" ? "המחיר המבוקש נמוך מהטווח" : "המחיר המבוקש גבוה מהטווח"} ({ctx.diffPct > 0 ? "+" : ""}<span className="num">{ctx.diffPct}%</span> מהחציון)
            </span>
          )}
          <Badge variant="muted">{internal.comparableCount} מודעות דומות · {internal.windowDays} ימים</Badge>
          <Badge variant="outline">רמת ביטחון: {confidenceLabel[internal.confidence]}</Badge>
        </div>
        <p className="text-xs text-muted-foreground">{internal.disclaimer}</p>
      </CardContent>
    </Card>
  );
}
