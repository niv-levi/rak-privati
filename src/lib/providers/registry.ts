import "server-only";
import type { ProviderInfo, ProviderKind } from "./types";
import { govVehiclesProvider } from "./gov-il/vehicles";
import { govHistoryProvider } from "./gov-il/history";
import { govRecallsProvider } from "./gov-il/recalls";
import { commercialValuationProvider, commercialHistoryProvider, smsProvider, emailProvider, analyticsProvider } from "./commercial";
import { createSupabaseAdminClient } from "@/lib/supabase/server";
import { fixturesEnabled } from "./fixtures";

export const providers: ProviderInfo[] = [
  govVehiclesProvider, govHistoryProvider, govRecallsProvider,
  commercialValuationProvider, commercialHistoryProvider,
  smsProvider, emailProvider, analyticsProvider,
];

export { govVehiclesProvider, govHistoryProvider, govRecallsProvider };

export function getProvider(key: string): ProviderInfo | undefined {
  return providers.find((p) => p.key === key);
}

export function providersByKind(kind: ProviderKind): ProviderInfo[] {
  return providers.filter((p) => p.kind === kind);
}

export type ProviderHealth = {
  key: string; nameHe: string; nameEn: string; kind: ProviderKind; version: string; sourceUrl?: string; datasetName?: string;
  usagePermission: string; supportedDataTypes: string[];
  configured: boolean; usingFixtures: boolean; hint: string;
  dbStatus?: string | null; lastSuccessAt?: string | null; lastError?: string | null; lastErrorAt?: string | null; enabled?: boolean;
};

/** Merges code-level configuration with the persisted health row (last success/error). */
export async function getProviderHealth(): Promise<ProviderHealth[]> {
  const admin = createSupabaseAdminClient();
  const rows = admin ? (await admin.from("vehicle_data_sources").select("key, status, last_success_at, last_error, last_error_at, enabled")).data ?? [] : [];
  const byKey = new Map(rows.map((r) => [r.key, r]));
  const fixtures = fixturesEnabled();
  return providers.map((p) => {
    const row = byKey.get(p.key);
    return {
      key: p.key, nameHe: p.nameHe, nameEn: p.nameEn, kind: p.kind, version: p.version, sourceUrl: p.sourceUrl, datasetName: p.datasetName,
      usagePermission: p.usagePermission, supportedDataTypes: p.supportedDataTypes,
      configured: p.isConfigured(), usingFixtures: fixtures && p.kind.startsWith("government"), hint: p.configurationHint(),
      dbStatus: row?.status ?? null, lastSuccessAt: row?.last_success_at ?? null, lastError: row?.last_error ?? null, lastErrorAt: row?.last_error_at ?? null, enabled: row?.enabled ?? true,
    };
  });
}

/** Persists the outcome of a provider call (fire-and-forget). */
export async function recordProviderOutcome(key: string, ok: boolean, error?: string): Promise<void> {
  const admin = createSupabaseAdminClient();
  if (!admin) return;
  const p = getProvider(key);
  const patch = ok
    ? { status: "configured" as const, last_success_at: new Date().toISOString(), last_error: null, last_error_at: null }
    : { status: (p?.isConfigured() ? "error" : "not_configured") as "error" | "not_configured", last_error: error ?? null, last_error_at: new Date().toISOString() };
  await admin.from("vehicle_data_sources").update(patch).eq("key", key);
}
