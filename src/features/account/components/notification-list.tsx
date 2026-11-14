"use client";
import * as React from "react";
import Link from "next/link";
import { CheckCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { markNotificationsReadAction } from "../actions";
import { notificationTypeLabels } from "@/lib/labels";
import { formatDateTime } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { Enums } from "@/lib/database.types";

type N = { id: string; type: Enums<"notification_type">; title: string; body: string | null; href: string | null; read_at: string | null; created_at: string };

export function NotificationList({ items }: { items: N[] }) {
  const [list, setList] = React.useState(items);
  const [pending, start] = React.useTransition();
  const unread = list.filter((n) => !n.read_at).length;
  const markAll = () => start(async () => { await markNotificationsReadAction(); setList((l) => l.map((n) => ({ ...n, read_at: n.read_at ?? new Date().toISOString() }))); });
  const markOne = (id: string) => { if (list.find((n) => n.id === id)?.read_at) return; setList((l) => l.map((n) => (n.id === id ? { ...n, read_at: new Date().toISOString() } : n))); void markNotificationsReadAction([id]); };
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground" role="status">{unread > 0 ? <><span className="num">{unread}</span> התראות שלא נקראו</> : "כל ההתראות נקראו"}</p>
        {unread > 0 && <Button size="sm" variant="outline" onClick={markAll} disabled={pending}><CheckCheck aria-hidden /> סימון הכול כנקרא</Button>}
      </div>
      <ul className="divide-y divide-border rounded-lg border border-border bg-card">
        {list.map((n) => (
          <li key={n.id} className={cn("p-4", !n.read_at && "bg-primary-soft/60")}>
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 space-y-1">
                <div className="flex flex-wrap items-center gap-2"><Badge variant="muted">{notificationTypeLabels[n.type]}</Badge><time className="text-xs text-muted-foreground num" dateTime={n.created_at}>{formatDateTime(n.created_at)}</time></div>
                {n.href ? <Link href={n.href} onClick={() => markOne(n.id)} className={cn("block hover:underline underline-offset-4", !n.read_at && "font-bold")}>{n.title}</Link> : <p className={!n.read_at ? "font-bold" : undefined}>{n.title}</p>}
                {n.body && <p className="text-sm text-muted-foreground">{n.body}</p>}
              </div>
              {!n.read_at && <button type="button" onClick={() => markOne(n.id)} className="shrink-0 text-xs font-semibold text-primary underline-offset-4 hover:underline">סימון כנקרא</button>}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
