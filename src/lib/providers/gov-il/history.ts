import "server-only";
import { datastoreSearch, str, num, isoDate, CkanError } from "./ckan";
import type { ProviderInfo, ProviderLookupResult, SourceRef } from "../types";
import { loadFixture } from "../fixtures";

/**
 * Historical test-mileage and ownership-type records (data.gov.il).
 * Coverage is partial: not every vehicle appears, and recorded ownership-type changes are NOT a legally
 * exact owner count. The resource id and field names must be verified by the operator.
 */
export type GovHistoryRecord = {
  mileage: { date: string | null; km: number }[];
  ownership: { date: string | null; ownershipType: string }[];
};

const DEFAULT_FIELDS = { plate: "mispar_rechev", testKm: "kilometer_test_aharon", testDate: "mivchan_acharon_dt", ownershipType: "baalut", ownershipDate: "baalut_dt" };

function fieldMap(): typeof DEFAULT_FIELDS {
  try {
    const override = process.env.GOV_VEHICLE_HISTORY_FIELD_MAP ? (JSON.parse(process.env.GOV_VEHICLE_HISTORY_FIELD_MAP) as Partial<typeof DEFAULT_FIELDS>) : {};
    return { ...DEFAULT_FIELDS, ...override };
  } catch {
    return DEFAULT_FIELDS;
  }
}

export const govHistoryProvider: ProviderInfo & { lookup(plate: string, signal?: AbortSignal): Promise<ProviderLookupResult<GovHistoryRecord>> } = {
  key: "gov_il_vehicle_history",
  nameHe: "היסטוריית נסועה ובעלויות – משרד התחבורה (data.gov.il)",
  nameEn: "Ministry of Transport mileage & ownership history (data.gov.il)",
  kind: "government_history",
  version: "1.0.0",
  sourceUrl: "https://data.gov.il",
  datasetName: "נתוני טסט ובעלויות היסטוריים",
  usagePermission: "רישיון מאגרי המידע הממשלתיים הפתוחים; כיסוי חלקי בלבד.",
  supportedDataTypes: ["test_mileage_history", "ownership_type_history"],
  isConfigured: () => !!process.env.GOV_VEHICLE_HISTORY_RESOURCE_ID,
  configurationHint: () => "יש להגדיר GOV_VEHICLE_HISTORY_RESOURCE_ID ולאמת את שמות השדות מול עמוד המאגר.",

  async lookup(plate, signal) {
    const started = Date.now();
    const source: SourceRef = { key: this.key, name: this.nameHe, dataset: this.datasetName, url: this.sourceUrl, retrievedAt: new Date().toISOString() };
    const fixture = loadFixture<GovHistoryRecord>("gov_history", plate);
    if (fixture !== undefined) return { status: fixture ? (fixture.mileage.length || fixture.ownership.length ? "available" : "not_found") : "not_found", data: fixture, durationMs: 5, source: { ...source, name: source.name + " (נתוני פיתוח)" } };
    if (!this.isConfigured()) return { status: "not_configured", data: null, durationMs: 0, source };
    const f = fieldMap();
    try {
      const { records } = await datastoreSearch(process.env.GOV_VEHICLE_HISTORY_RESOURCE_ID!, { [f.plate]: Number(plate) }, { limit: 100, signal });
      if (!records.length) return { status: "not_found", data: null, durationMs: Date.now() - started, source };
      const mileage = records
        .map((r) => ({ date: isoDate(r[f.testDate]), km: num(r[f.testKm]) }))
        .filter((x): x is { date: string | null; km: number } => x.km != null && x.km > 0)
        .sort((a, b) => (a.date ?? "").localeCompare(b.date ?? ""));
      const ownership = records
        .map((r) => ({ date: isoDate(r[f.ownershipDate]), ownershipType: str(r[f.ownershipType]) }))
        .filter((x): x is { date: string | null; ownershipType: string } => !!x.ownershipType)
        .sort((a, b) => (a.date ?? "").localeCompare(b.date ?? ""));
      // de-duplicate identical rows
      const seen = new Set<string>();
      const dedupOwn = ownership.filter((o) => { const k = `${o.date}|${o.ownershipType}`; if (seen.has(k)) return false; seen.add(k); return true; });
      return { status: mileage.length || dedupOwn.length ? "available" : "partial", data: { mileage, ownership: dedupOwn }, durationMs: Date.now() - started, source };
    } catch (e) {
      const err = e instanceof CkanError ? e : new CkanError(String(e), "network");
      return { status: "unavailable", data: null, durationMs: Date.now() - started, error: `${err.kind}: ${err.message}`, source };
    }
  },
};
