"use client";
import * as React from "react";
import { Button } from "@/components/ui/button";
import { signOutEverywhereAction } from "@/features/auth/actions";

export function SignOutEverywhereButton() {
  const [pending, start] = React.useTransition();
  return <Button variant="outline" disabled={pending} onClick={() => start(() => signOutEverywhereAction())}>{pending ? "מנתק…" : "ניתוק מכל המכשירים"}</Button>;
}
