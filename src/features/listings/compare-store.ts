"use client";
import * as React from "react";

const KEY = "rp:compare";
const MAX = 3;

function read(): string[] {
  try {
    const raw = localStorage.getItem(KEY);
    const arr = raw ? (JSON.parse(raw) as unknown) : [];
    return Array.isArray(arr) ? arr.filter((x): x is string => typeof x === "string").slice(0, MAX) : [];
  } catch {
    return [];
  }
}

/** Comparison list lives in the browser only (no account needed). */
export function useCompare() {
  const [ids, setIds] = React.useState<string[]>([]);
  const [hydrated, setHydrated] = React.useState(false);
  React.useEffect(() => {
    setIds(read());
    setHydrated(true);
    const onStorage = (e: StorageEvent) => { if (e.key === KEY) setIds(read()); };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);
  const write = (next: string[]) => {
    setIds(next);
    try { localStorage.setItem(KEY, JSON.stringify(next)); } catch { /* ignore */ }
  };
  return {
    ids, hydrated,
    toggle: (id: string) => write(ids.includes(id) ? ids.filter((x) => x !== id) : ids.length >= MAX ? ids : [...ids, id]),
    remove: (id: string) => write(ids.filter((x) => x !== id)),
    clear: () => write([]),
  };
}
