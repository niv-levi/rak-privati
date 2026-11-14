import Link from "next/link";
import { Database, ExternalLink } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { DataStatusBadge } from "@/features/vehicle-check/components/status-badge";
import { formatDate, formatNumber } from "@/lib/format";
import type { VehicleReport } from "@/lib/providers/types";

/** Compact, honest summary of the official snapshot attached to a listing. */
export function OfficialDataCard({ report, fetchedAt, discrepancyNotes, plateMasked }: { report: VehicleReport | null; fetchedAt: string | null; discrepancyNotes: string | null; plateMasked: string | null }) {
  return (
    <Card>
      <CardHeader className="flex-row items-start justify-between gap-3 space-y-0">
        <div>
          <CardTitle className="flex items-center gap-2 text-base"><Database className="size-5 text-primary" aria-hidden /> נתונים רשמיים זמינים</CardTitle>
          <CardDescription>{plateMasked ? <>מספר רישוי <span className="num">{plateMasked}</span> · </> : null}{fetchedAt ? <>נשלף ב-<span className="num">{formatDate(fetchedAt)}</span></> : "לא בוצעה שליפה"}</CardDescription>
        </div>
        {report && <DataStatusBadge status={report.overallStatus} />}
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        {!report ? (
          <p className="text-muted-foreground">למודעה זו לא צורפו נתונים ממקורות רשמיים. ניתן לבצע בדיקה עצמאית בעמוד <Link href="/vehicle-check" className="underline underline-offset-4">בדיקת רכב</Link> לאחר קבלת מספר הרישוי מהמוכר.</p>
        ) : (
          <>
            <dl className="grid grid-cols-2 gap-3">
              {[
                { l: "יצרן ודגם במקור", v: [report.identification.make.value, report.identification.commercialName.value ?? report.identification.model.value].filter(Boolean).join(" ") || null },
                { l: "שנת ייצור במקור", v: report.identification.year.value },
                { l: "נסועה בטסט האחרון", v: report.lastTestMileage.value != null ? `${formatNumber(report.lastTestMileage.value)} ק״מ` : null },
                { l: "סוג בעלות רשום", v: report.registration.ownershipType.value },
                { l: "תוקף רישוי", v: report.registration.registrationValidUntil.value ? formatDate(report.registration.registrationValidUntil.value) : null },
                { l: "רשומות בעלות מתועדות", v: report.ownershipHistory.records.length || null },
              ].map((x) => (
                <div key={x.l} className="rounded-md bg-secondary/70 p-2.5">
                  <dt className="text-xs text-muted-foreground">{x.l}</dt>
                  <dd className="font-semibold num">{x.v ?? <span className="font-normal text-muted-foreground">לא נמצא מידע זמין</span>}</dd>
                </div>
              ))}
            </dl>
            {report.warnings.length > 0 && <ul className="list-disc space-y-1 ps-5 text-muted-foreground">{report.warnings.slice(0, 3).map((w, i) => <li key={i}>{w.text}</li>)}</ul>}
            {discrepancyNotes && <p className="rounded-md border border-warning/40 bg-warning-soft p-2.5"><strong>הערת המוכר על הנתונים הרשמיים:</strong> {discrepancyNotes}</p>}
            <p className="text-xs text-muted-foreground">{report.disclaimer} מקורות: {report.sources.filter((s) => s.status === "available" || s.status === "partial").map((s) => s.name).join("; ") || "לא התקבל מידע מהמקורות"}.</p>
            <Link href="/data-sources" className="inline-flex items-center gap-1 text-xs font-semibold text-primary underline-offset-4 hover:underline">על מקורות המידע ומגבלותיהם <ExternalLink className="size-3" aria-hidden /></Link>
          </>
        )}
      </CardContent>
    </Card>
  );
}
