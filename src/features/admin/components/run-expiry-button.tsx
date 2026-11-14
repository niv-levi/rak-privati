"use client";
import * as React from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { runExpiryNowAction } from "../actions";

export function RunExpiryButton() {
  const [pending, start] = React.useTransition();
  const { push } = useToast();
  return <Button variant="outline" size="sm" disabled={pending} onClick={() => start(async () => { const r = await runExpiryNowAction(); push(r.ok ? { kind: "success", title: r.message ?? "בוצע" } : { kind: "error", title: r.error }); })}>{pending ? "מריץ…" : "הרצת פקיעת מודעות"}</Button>;
}
