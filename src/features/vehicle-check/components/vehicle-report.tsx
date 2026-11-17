import { AlertTriangle, Car, ClipboardList, Database, FileWarning, Gauge, History, Info, ShieldAlert, Users, Wrench } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { formatDate, formatNumber } from "@/lib/format";
import type { AttributedField, DataStatus, SourceRef, VehicleReport } from "@/lib/providers/types";
import { DataStatusBadge } from "./status-badge";
import { MileageChart } from "./mileage-chart";
import { cn } from "@/lib/utils";

function SourceLine({ source, fallback }: { source?: SourceRef; fallback?: string }) {
  if (!source) return fallback ? <p className="text-xs text-muted-foreground">{fallback}</p> : null;
  return (
    <p className="text-xs text-muted-foreground">
      מקור: {source.name}
      {source.dataset ? ` · ${source.dataset}` : ""} · נשלף ב-<span className="num">{formatDate(source.retrievedAt)}</span>
      {source.sourceUpdatedAt ? <> · עדכון במקור: <span className="num">{formatDate(source.sourceUpdatedAt)}</span></> : null}
    </p>
  );
}

function FieldRow({ label, field, format }: { label: string; field: AttributedField<string | number | boolean | null>; format?: (v: string | number | boolean) => string }) {
  const empty = field.value == null;
  return (
    <div className="flex flex-col gap-0.5 border-b border-border py-2.5 last:border-0 sm:flex-row sm:items-baseline sm:justify-between sm:gap-4">
      <dt className="text-sm text-muted-foreground">{label}</dt>
      <dd className="text-sm font-semibold text-start sm:text-end">
        {empty ? (
          <span className="font-normal text-muted-foreground">{field.status === "not_configured" ? "המקור לא הוגדר" : field.status === "unavailable" ? "המקור לא זמין כרגע" : "לא נמצא מידע זמין"}</span>
        ) : (
          <span className={typeof field.value === "number" || /\d/.test(String(field.value)) ? "num" : undefined}>{format ? format(field.value as string | number | boolean) : String(field.value)}</span>
        )}
        {field.note && <span className="block text-xs font-normal text-muted-foreground">{field.note}</span>}
      </dd>
    </div>
  );
}

function Section({ icon, title, description, status, source, children, id }: { icon: React.ReactNode; title: string; description?: string; status: DataStatus; source?: SourceRef; children: React.ReactNode; id: string }) {
  return (
    <Card id={id} aria-labelledby={`${id}-title`}>
      <CardHeader className="flex-row items-start justify-between gap-3 space-y-0">
        <div className="space-y-1">
          <CardTitle id={`${id}-title`} className="flex items-center gap-2 text-base [&_svg]:size-5 [&_svg]:text-primary">{icon} {title}</CardTitle>
          {description && <CardDescription>{description}</CardDescription>}
        </div>
        <DataStatusBadge status={status} />
      </CardHeader>
      <CardContent className="space-y-3">
        {children}
        <SourceLine source={source} />
      </CardContent>
    </Card>
  );
}

const sectionStatus = (fields: AttributedField<unknown>[]): DataStatus => {
  const vals = fields.map((f) => f.status);
  if (vals.every((s) => s === "available")) return "available";
  if (vals.some((s) => s === "available")) return "partial";
  return vals[0] ?? "not_found";
};

export function VehicleReportView({ report, className }: { report: VehicleReport; className?: string }) {
  const idFields = Object.values(report.identification);
  const specFields = Object.values(report.specs);
  const regFields = Object.values(report.registration);
  const idSource = idFields.find((f) => f.source)?.source;
  const title = [report.identification.make.value, report.identification.commercialName.value ?? report.identification.model.value, report.identification.year.value].filter(Boolean).join(" ");

  return (
    <div className={cn("space-y-6", className)}>
      <div className="rounded-xl bg-brand-dark p-6 text-white sm:p-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-sm text-white/70">דוח רכב · מספר רישוי <span className="num font-semibold text-white">{report.plateMasked}</span></p>
            <h2 className="mt-1 text-2xl font-extrabold sm:text-3xl">{title || "לא נמצאו פרטי זיהוי"}</h2>
            <p className="mt-2 text-sm text-white/70">הופק ב-<span className="num">{formatDate(report.fetchedAt)}</span></p>
          </div>
          <DataStatusBadge status={report.overallStatus} className="bg-white/10 text-white border-white/20" />
        </div>
        <dl className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
          {[
            { label: "שנת ייצור", v: report.identification.year.value },
            { label: "נסועה בטסט האחרון", v: report.lastTestMileage.value != null ? `${formatNumber(report.lastTestMileage.value)} ק״מ` : null },
            { label: "סוג בעלות רשום", v: report.registration.ownershipType.value },
            { label: "תוקף רישוי", v: report.registration.registrationValidUntil.value ? formatDate(report.registration.registrationValidUntil.value) : null },
          ].map((x) => (
            <div key={x.label} className="rounded-lg bg-white/10 p-3">
              <dt className="text-xs text-white/70">{x.label}</dt>
              <dd className="mt-0.5 font-bold num">{x.v ?? <span className="font-normal text-white/60">לא נמצא</span>}</dd>
            </div>
          ))}
        </dl>
      </div>

      <Alert variant="info">
        <AlertDescription>{report.disclaimer}</AlertDescription>
      </Alert>

      {report.warnings.length > 0 && (
        <Section id="warnings" icon={<ShieldAlert />} title="סימני אזהרה ונקודות לבדיקה" status="available">
          <ul className="space-y-2">
            {report.warnings.map((w, i) => (
              <li key={i} className={cn("flex gap-2 rounded-md p-3 text-sm", w.level === "warning" ? "bg-warning-soft" : "bg-secondary")}>
                {w.level === "warning" ? <AlertTriangle className="size-4 shrink-0 text-warning mt-0.5" aria-hidden /> : <Info className="size-4 shrink-0 text-primary mt-0.5" aria-hidden />}
                <span>{w.text}</span>
              </li>
            ))}
          </ul>
        </Section>
      )}

      {report.conflicts.length > 0 && (
        <Section id="conflicts" icon={<FileWarning />} title="נתונים סותרים בין מקורות" status="needs_review" description="מצאנו ערכים שאינם מתיישבים זה עם זה. מומלץ לברר מול המוכר.">
          <ul className="space-y-2 text-sm">
            {report.conflicts.map((c, i) => (
              <li key={i} className="rounded-md border border-border p-3">
                <p className="font-semibold">{c.field}</p>
                <ul className="mt-1 text-muted-foreground">{c.values.map((v, j) => <li key={j}>{v.source}: <span className="num font-semibold text-foreground">{v.value}</span></li>)}</ul>
              </li>
            ))}
          </ul>
        </Section>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <Section id="identification" icon={<Car />} title="זיהוי הרכב" status={sectionStatus(idFields)} source={idSource}>
          <dl>
            <FieldRow label="יצרן" field={report.identification.make} />
            <FieldRow label="דגם (כפי שרשום במקור)" field={report.identification.model} />
            <FieldRow label="כינוי מסחרי" field={report.identification.commercialName} />
            <FieldRow label="רמת גימור" field={report.identification.trim} />
            <FieldRow label="שנת ייצור" field={report.identification.year} />
            <FieldRow label="צבע" field={report.identification.color} />
            <FieldRow label="סוג מרכב" field={report.identification.bodyStyle} />
          </dl>
        </Section>
        <Section id="specs" icon={<Wrench />} title="מפרט טכני" status={sectionStatus(specFields)} source={specFields.find((f) => f.source)?.source}>
          <dl>
            <FieldRow label="דגם מנוע" field={report.specs.engineModel} />
            <FieldRow label="סוג דלק" field={report.specs.fuel} />
            <FieldRow label="נפח מנוע" field={report.specs.engineCc} format={(v) => `${formatNumber(Number(v))} סמ״ק`} />
            <FieldRow label="תיבת הילוכים" field={report.specs.transmission} />
            <FieldRow label="קבוצת זיהום" field={report.specs.pollutionGroup} />
            <FieldRow label="רמת אבזור בטיחותי" field={report.specs.safetyLevel} />
            <FieldRow label="צמיגים קדמיים" field={report.specs.frontTires} />
            <FieldRow label="צמיגים אחוריים" field={report.specs.rearTires} />
          </dl>
        </Section>
        <Section id="registration" icon={<ClipboardList />} title="רישוי ובעלות" status={sectionStatus(regFields)} source={regFields.find((f) => f.source)?.source}>
          <dl>
            <FieldRow label="מועד עלייה לכביש" field={report.registration.firstOnRoad} />
            <FieldRow label="סוג בעלות נוכחי" field={report.registration.ownershipType} />
            <FieldRow label="תוקף רישוי" field={report.registration.registrationValidUntil} format={(v) => formatDate(String(v))} />
            <FieldRow label="טסט אחרון" field={report.registration.lastTestDate} format={(v) => formatDate(String(v))} />
            <FieldRow label="הוראת רישום" field={report.registration.registrationInstruction} />
            <FieldRow label="סיומת מספר שלדה" field={report.registration.vinSuffix} format={(v) => `…${v}`} />
          </dl>
        </Section>
        <Section id="mileage" icon={<Gauge />} title="נסועה מתועדת" status={report.mileageHistory.status} source={report.mileageHistory.source} description="נסועה שנרשמה בטסטים. הנסועה הנוכחית עשויה להיות גבוהה יותר.">
          {report.mileageHistory.records.length ? (
            <>
              <MileageChart records={report.mileageHistory.records.map((r) => ({ date: r.date, km: r.km }))} />
              <table className="w-full text-sm">
                <caption className="sr-only">נסועה לפי תאריך טסט</caption>
                <thead><tr className="text-start text-xs text-muted-foreground"><th scope="col" className="py-1 text-start font-semibold">תאריך</th><th scope="col" className="py-1 text-end font-semibold">נסועה (ק״מ)</th></tr></thead>
                <tbody>
                  {report.mileageHistory.records.map((r, i) => (
                    <tr key={i} className="border-t border-border"><td className="py-1.5"><span className="num">{r.date ? formatDate(r.date) : "—"}</span></td><td className="py-1.5 text-end font-semibold"><span className="num">{formatNumber(r.km)}</span></td></tr>
                  ))}
                </tbody>
              </table>
            </>
          ) : (
            <p className="text-sm text-muted-foreground">לא נמצא מידע זמין על נסועה היסטורית. אין להסיק מכך דבר על מצב הרכב.</p>
          )}
        </Section>
        <Section id="ownership" icon={<Users />} title="היסטוריית סוג בעלות" status={report.ownershipHistory.status} source={report.ownershipHistory.source} description={report.ownershipHistory.note}>
          {report.ownershipHistory.records.length ? (
            <ol className="relative space-y-3 border-s-2 border-border ps-4">
              {report.ownershipHistory.records.map((r, i) => (
                <li key={i} className="relative">
                  <span aria-hidden className="absolute -start-[1.3rem] top-1.5 size-3 rounded-full border-2 border-card bg-primary" />
                  <p className="text-sm font-semibold">{r.ownershipType}</p>
                  <p className="text-xs text-muted-foreground num">{r.date ? formatDate(r.date) : "תאריך לא ידוע"}</p>
                </li>
              ))}
            </ol>
          ) : (
            <p className="text-sm text-muted-foreground">לא נמצאה היסטוריית בעלויות מתועדת במקורות הזמינים.</p>
          )}
        </Section>
        <Section id="recalls" icon={<History />} title="קריאות שירות (ריקול)" status={report.recalls.status} source={report.recalls.source} description="היעדר רשומות אינו מעיד שהרכב ללא תקלות או ללא תאונות.">
          {report.recalls.records.length ? (
            <ul className="space-y-2">
              {report.recalls.records.map((r, i) => (
                <li key={i} className="rounded-md border border-border p-3 text-sm">
                  <p className="font-semibold">{r.title}{r.code && <span className="num text-xs text-muted-foreground"> · {r.code}</span>}</p>
                  {r.description && <p className="mt-1 text-muted-foreground">{r.description}</p>}
                  {r.publishedAt && <p className="mt-1 text-xs text-muted-foreground">פורסם: <span className="num">{formatDate(r.publishedAt)}</span></p>}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">{report.recalls.status === "not_found" ? "לא נמצאו קריאות שירות רשומות לרכב זה במקור." : "לא ניתן לאמת באמצעות המקורות הזמינים."}</p>
          )}
        </Section>
      </div>

      <Section id="missing" icon={<Info />} title="מידע שלא נמצא או שאינו זמין" status={report.missing.length ? "partial" : "available"}>
        {report.missing.length ? (
          <ul className="flex flex-wrap gap-2">{report.missing.map((m) => <li key={m}><Badge variant="muted">{m}</Badge></li>)}</ul>
        ) : (
          <p className="text-sm text-muted-foreground">כל המקורות המוגדרים החזירו מידע.</p>
        )}
      </Section>

      <Section id="sources" icon={<Database />} title="מקורות המידע בדוח זה" status="available" description="לכל מקור מצוין מצב התגובה. מקור שלא הוגדר או שאינו זמין אינו משפיע על יתר הדוח.">
        <ul className="divide-y divide-border">
          {report.sources.map((s) => (
            <li key={s.key} className="flex flex-wrap items-center justify-between gap-2 py-2 text-sm">
              <span>{s.name}</span>
              <span className="flex items-center gap-2"><DataStatusBadge status={s.status} />{s.durationMs > 0 && <span className="text-xs text-muted-foreground num">{s.durationMs} ms</span>}</span>
              {s.error && <span className="w-full text-xs text-muted-foreground" dir="ltr">{s.error}</span>}
            </li>
          ))}
        </ul>
      </Section>
    </div>
  );
}
