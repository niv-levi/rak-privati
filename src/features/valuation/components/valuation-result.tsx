import { Info } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { formatDateTime, formatPrice } from "@/lib/format";
import type { ValuationResult } from "../engine";
import { PriceContext } from "./price-context";

const statusLabel = { ok: "חושב", insufficient_data: "אין מספיק נתונים", not_configured: "לא מחובר", error: "שגיאה" } as const;
const statusVariant = { ok: "success", insufficient_data: "warning", not_configured: "outline", error: "destructive" } as const;

export function ValuationResultView({ result }: { result: ValuationResult }) {
  const internal = result.sources.find((s) => s.key === "internal_listings")!;
  const anyOk = result.sources.some((s) => s.status === "ok");
  return (
    <div className="space-y-6" aria-live="polite">
      {!anyOk && (
        <Alert variant="warning">
          <AlertTitle>לא ניתן לחשב הערכה אמינה כרגע</AlertTitle>
          <AlertDescription>{internal.status === "insufficient_data" ? `נמצאו ${internal.comparableCount} מודעות דומות בלבד בלוח. אנחנו לא מציגים טווח על בסיס נתונים דלים כדי לא להטעות.` : "מקורות ההערכה אינם זמינים."} ספק הערכה מסחרי יחובר בהמשך, בכפוף להסכם.</AlertDescription>
        </Alert>
      )}
      {internal.status === "ok" && <PriceContext valuation={result} askingPrice={result.input.asking_price ?? null} />}
      <div className="grid gap-4 lg:grid-cols-2">
        {result.sources.map((s) => (
          <Card key={s.key}>
            <CardHeader className="flex-row items-start justify-between gap-3 space-y-0">
              <div><CardTitle className="text-base">{s.label}</CardTitle><CardDescription>חושב ב-<span className="num">{formatDateTime(s.calculatedAt)}</span></CardDescription></div>
              <Badge variant={statusVariant[s.status]}>{statusLabel[s.status]}</Badge>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              {s.status === "ok" && s.low && s.high && (
                <dl className="grid grid-cols-3 gap-2 text-center">
                  <div className="rounded-md bg-secondary p-2"><dt className="text-xs text-muted-foreground">נמוך</dt><dd className="font-bold num">{formatPrice(s.low)}</dd></div>
                  <div className="rounded-md bg-primary-soft p-2"><dt className="text-xs text-muted-foreground">חציון</dt><dd className="font-bold num">{formatPrice(s.mid)}</dd></div>
                  <div className="rounded-md bg-secondary p-2"><dt className="text-xs text-muted-foreground">גבוה</dt><dd className="font-bold num">{formatPrice(s.high)}</dd></div>
                </dl>
              )}
              {s.factors.length > 0 && <div><h4 className="font-semibold">גורמים שנלקחו בחשבון</h4><ul className="mt-1 list-disc space-y-0.5 ps-5 text-muted-foreground">{s.factors.map((f) => <li key={f.label}><strong className="text-foreground">{f.label}:</strong> {f.effect}</li>)}</ul></div>}
              <div><h4 className="font-semibold">מגבלות</h4><ul className="mt-1 list-disc space-y-0.5 ps-5 text-muted-foreground">{s.limitations.map((l, i) => <li key={i}>{l}</li>)}</ul></div>
              <p className="flex items-start gap-2 text-xs text-muted-foreground"><Info className="size-4 shrink-0" aria-hidden /> {s.disclaimer}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
