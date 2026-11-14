import "server-only";
import { datastoreSearch, str, isoDate, CkanError } from "./ckan";
import type { ProviderInfo, ProviderLookupResult, SourceRef, RecallRecord } from "../types";
import { loadFixture } from "../fixtures";

/** Recall (קריאת שירות) notices published by the Ministry of Transport on data.gov.il. */
const DEFAULT_FIELDS = { plate: "mispar_rechev", code: "recall_id", title: "teur_takala", description: "teur_tikun", date: "tarich_pirsum" };

function fieldMap(): typeof DEFAULT_FIELDS {
  try {
    const override = process.env.GOV_VEHICLE_RECALLS_FIELD_MAP ? (JSON.parse(process.env.GOV_VEHICLE_RECALLS_FIELD_MAP) as Partial<typeof DEFAULT_FIELDS>) : {};
    return { ...DEFAULT_FIELDS, ...override };
  } catch {
    return DEFAULT_FIELDS;
  }
}

export const govRecallsProvider: ProviderInfo & { lookup(plate: string, signal?: AbortSignal): Promise<ProviderLookupResult<RecallRecord[]>> } = {
  key: "gov_il_recalls",
  nameHe: "קריאות ריקול – משרד התחבורה (data.gov.il)",
  nameEn: "Ministry of Transport recall notices (data.gov.il)",
  kind: "government_recalls",
  version: "1.0.0",
  sourceUrl: "https://data.gov.il",
  datasetName: "קריאות שירות (ריקול)",
  usagePermission: "רישיון מאגרי המידע הממשלתיים הפתוחים.",
  supportedDataTypes: ["recalls"],
  isConfigured: () => !!process.env.GOV_VEHICLE_RECALLS_RESOURCE_ID,
  configurationHint: () => "יש להגדיר GOV_VEHICLE_RECALLS_RESOURCE_ID ולאמת את שמות השדות.",

  async lookup(plate, signal) {
    const started = Date.now();
    const source: SourceRef = { key: this.key, name: this.nameHe, dataset: this.datasetName, url: this.sourceUrl, retrievedAt: new Date().toISOString() };
    const fixture = loadFixture<Omit<RecallRecord, "source">[]>("gov_recalls", plate);
    if (fixture !== undefined) {
      const src = { ...source, name: source.name + " (נתוני פיתוח)" };
      return { status: fixture && fixture.length ? "available" : "not_found", data: (fixture ?? []).map((r) => ({ ...r, source: src })), durationMs: 5, source: src };
    }
    if (!this.isConfigured()) return { status: "not_configured", data: null, durationMs: 0, source };
    const f = fieldMap();
    try {
      const { records } = await datastoreSearch(process.env.GOV_VEHICLE_RECALLS_RESOURCE_ID!, { [f.plate]: Number(plate) }, { limit: 50, signal });
      const data: RecallRecord[] = records.map((r) => ({
        code: str(r[f.code]),
        title: str(r[f.title]) ?? "קריאת שירות",
        description: str(r[f.description]),
        publishedAt: isoDate(r[f.date]),
        source,
        applies: "vehicle",
      }));
      return { status: data.length ? "available" : "not_found", data, durationMs: Date.now() - started, source };
    } catch (e) {
      const err = e instanceof CkanError ? e : new CkanError(String(e), "network");
      return { status: "unavailable", data: null, durationMs: Date.now() - started, error: `${err.kind}: ${err.message}`, source };
    }
  },
};
