"use client";
import * as React from "react";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { updateNotificationPrefsAction } from "../actions";

type Prefs = { in_app: boolean; email: boolean; sms_important: boolean; saved_search: boolean; marketing: boolean };

export function NotificationPrefsForm({ initial, emailConfigured }: { initial: Prefs; emailConfigured: boolean }) {
  const [p, setP] = React.useState(initial);
  const [pending, start] = React.useTransition();
  const { push } = useToast();
  const rows: { key: keyof Prefs; label: string; desc: string; disabled?: boolean }[] = [
    { key: "in_app", label: "התראות באתר", desc: "עדכונים על המודעות שלכם ופניות של קונים (תמיד פעיל לאירועי אבטחה)." },
    { key: "saved_search", label: "התאמות לחיפושים שמורים", desc: "התראה כשמתפרסם רכב שמתאים לחיפוש ששמרתם." },
    { key: "email", label: "עותק בדוא״ל", desc: emailConfigured ? "שליחת התראות חשובות גם לדוא״ל." : "יופעל לאחר חיבור ספק דוא״ל.", disabled: !emailConfigured },
    { key: "sms_important", label: "SMS להודעות חשובות בלבד", desc: "אישור/דחיית מודעה ואירועי אבטחה. ללא פרסומות." },
    { key: "marketing", label: "דיוור שיווקי", desc: "טיפים ועדכונים מרק פרטי. הסכמה נפרדת שניתן לבטל בכל עת. לא מסומן כברירת מחדל." },
  ];
  return (
    <form onSubmit={(e) => { e.preventDefault(); start(async () => { const r = await updateNotificationPrefsAction(p); push(r.ok ? { kind: "success", title: r.message ?? "נשמר" } : { kind: "error", title: r.error }); }); }} className="space-y-3 rounded-lg border border-border bg-card p-4">
      {rows.map((r) => (
        <div key={r.key} className="flex items-start justify-between gap-4 border-b border-border py-3 last:border-0">
          <div><Label htmlFor={`pref-${r.key}`}>{r.label}</Label><p className="text-xs text-muted-foreground">{r.desc}</p></div>
          <Switch id={`pref-${r.key}`} checked={p[r.key]} disabled={r.disabled} onCheckedChange={(v) => setP((x) => ({ ...x, [r.key]: v }))} />
        </div>
      ))}
      <Button type="submit" disabled={pending}>{pending ? "שומר…" : "שמירת העדפות"}</Button>
    </form>
  );
}
