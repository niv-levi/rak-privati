import "server-only";

/**
 * Minimal client for the CKAN DataStore API exposed by data.gov.il.
 * Official documentation: https://docs.ckan.org/en/latest/maintaining/datastore.html#ckanext.datastore.logic.action.datastore_search
 * We only ever call `datastore_search` with exact-match filters (no scraping, no undocumented endpoints).
 */
export type CkanRecord = Record<string, unknown>;

export class CkanError extends Error {
  constructor(message: string, public readonly kind: "timeout" | "http" | "parse" | "network") {
    super(message);
  }
}

export function ckanBase(): string {
  return (process.env.GOV_DATA_API_BASE ?? "https://data.gov.il/api/3/action").replace(/\/$/, "");
}

export function ckanTimeoutMs(): number {
  const n = Number(process.env.GOV_DATA_TIMEOUT_MS ?? 8000);
  return Number.isFinite(n) && n > 500 ? n : 8000;
}

export async function datastoreSearch(resourceId: string, filters: Record<string, string | number>, opts: { limit?: number; signal?: AbortSignal; sort?: string } = {}): Promise<{ records: CkanRecord[]; total: number }> {
  const url = new URL(`${ckanBase()}/datastore_search`);
  url.searchParams.set("resource_id", resourceId);
  url.searchParams.set("filters", JSON.stringify(filters));
  url.searchParams.set("limit", String(opts.limit ?? 50));
  if (opts.sort) url.searchParams.set("sort", opts.sort);

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ckanTimeoutMs());
  const onAbort = () => controller.abort();
  opts.signal?.addEventListener("abort", onAbort);
  try {
    const res = await fetch(url, { signal: controller.signal, headers: { accept: "application/json" }, cache: "no-store" });
    if (!res.ok) throw new CkanError(`CKAN HTTP ${res.status}`, "http");
    const json = (await res.json()) as { success?: boolean; result?: { records?: CkanRecord[]; total?: number }; error?: unknown };
    if (!json.success || !json.result) throw new CkanError("CKAN returned an error payload", "parse");
    return { records: json.result.records ?? [], total: json.result.total ?? 0 };
  } catch (e) {
    if (e instanceof CkanError) throw e;
    if ((e as Error).name === "AbortError") throw new CkanError("CKAN request timed out", "timeout");
    throw new CkanError((e as Error).message || "network error", "network");
  } finally {
    clearTimeout(timer);
    opts.signal?.removeEventListener("abort", onAbort);
  }
}

// ---- value normalizers shared by the gov adapters -------------------------
export const str = (v: unknown): string | null => {
  if (v == null) return null;
  const s = String(v).trim();
  return s === "" || s.toLowerCase() === "null" ? null : s;
};
export const num = (v: unknown): number | null => {
  if (v == null || v === "") return null;
  const n = Number(String(v).replace(/[^\d.-]/g, ""));
  return Number.isFinite(n) ? n : null;
};
/** Accepts "2024-03-15T00:00:00", "2024-03-15", "15/03/2024", "2024-03" → ISO date (YYYY-MM-DD or YYYY-MM). */
export const isoDate = (v: unknown): string | null => {
  const s = str(v);
  if (!s) return null;
  const m1 = s.match(/^(\d{4})-(\d{2})(?:-(\d{2}))?/);
  if (m1) return m1[3] ? `${m1[1]}-${m1[2]}-${m1[3]}` : `${m1[1]}-${m1[2]}`;
  const m2 = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (m2) return `${m2[3]}-${m2[2].padStart(2, "0")}-${m2[1].padStart(2, "0")}`;
  return null;
};
