"use client";
import * as React from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";
import { updateSettingAction } from "../actions";
import { formatDateTime } from "@/lib/format";

export function SettingsTable({ settings, canEdit }: { settings: { key: string; value: string; description: string | null; updated_at: string }[]; canEdit: boolean }) {
  const [values, setValues] = React.useState<Record<string, string>>(Object.fromEntries(settings.map((s) => [s.key, s.value])));
  const [pending, start] = React.useTransition();
  const { push } = useToast();
  const router = useRouter();
  return (
    <div className="overflow-x-auto rounded-lg border border-border bg-card">
      <table className="w-full min-w-[720px] text-sm">
        <caption className="sr-only">הגדרות</caption>
        <thead className="bg-secondary/60 text-xs text-muted-foreground"><tr><th scope="col" className="p-3 text-start">מפתח</th><th scope="col" className="p-3 text-start">תיאור</th><th scope="col" className="p-3 text-start">ערך (JSON)</th><th scope="col" className="p-3 text-start">עודכן</th><th scope="col" className="p-3"><span className="sr-only">שמירה</span></th></tr></thead>
        <tbody>
          {settings.map((s) => (
            <tr key={s.key} className="border-t border-border">
              <td className="p-3 font-mono text-xs" dir="ltr">{s.key}</td>
              <td className="p-3 text-muted-foreground">{s.description}</td>
              <td className="p-3"><label htmlFor={`set-${s.key}`} className="sr-only">ערך עבור {s.key}</label><Input id={`set-${s.key}`} dir="ltr" value={values[s.key] ?? ""} onChange={(e) => setValues({ ...values, [s.key]: e.target.value })} disabled={!canEdit} className="h-9 font-mono text-xs" /></td>
              <td className="p-3 num text-xs text-muted-foreground">{formatDateTime(s.updated_at)}</td>
              <td className="p-3">{canEdit && <Button size="sm" variant="outline" disabled={pending || values[s.key] === s.value} onClick={() => start(async () => { const r = await updateSettingAction(s.key, values[s.key] ?? ""); push(r.ok ? { kind: "success", title: r.message ?? "נשמר" } : { kind: "error", title: r.error }); router.refresh(); })}>שמירה</Button>}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
