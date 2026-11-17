"use client";
import * as React from "react";

const KEY = "rp:compare";
const MAX = 3;
const EVENT = "rp:compare-change";
const EMPTY: string[] = [];
let cache: { raw: string | null; ids: string[] } = { raw: null, ids: EMPTY };

function read(): string[] {
  let raw: string | null = null;
  try { raw = localStorage.getItem(KEY); } catch { return EMPTY; }
  if (raw === cache.raw) return cache.ids;
  let ids: string[] = EMPTY;
  try {
    const arr = raw ? (JSON.parse(raw) as unknown) : [];
    ids = Array.isArray(arr) ? arr.filter((x): x is string => typeof x === "string").slice(0, MAX) : EMPTY;
  } catch { ids = EMPTY; }
  cache = { raw, ids };
  return ids;
}

function subscribe(cb: () => void) {
  const onStorage = (e: StorageEvent) => { if (e.key === KEY) cb(); };
  window.addEventListener("storage", onStorage);
  window.addEventListener(EVENT, cb);
  return () => { window.removeEventListener("storage", onStorage); window.removeEventListener(EVENT, cb); };
}

function write(next: string[]) {
  try { localStorage.setItem(KEY, JSON.stringify(next)); } catch { /* storage unavailable */ }
  window.dispatchEvent(new Event(EVENT));
}

const noopSubscribe = () => () => {};

/** Comparison list lives in the browser only (no account needed). */
export function useCompare() {
  const ids = React.useSyncExternalStore(subscribe, read, () => EMPTY);
  const hydrated = React.useSyncExternalStore(noopSubscribe, () => true, () => false);
  return {
    ids, hydrated,
    toggle: (id: string) => write(ids.includes(id) ? ids.filter((x) => x !== id) : ids.length >= MAX ? ids : [...ids, id]),
    remove: (id: string) => write(ids.filter((x) => x !== id)),
    clear: () => write([]),
  };
}
