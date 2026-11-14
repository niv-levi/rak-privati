import "server-only";
import { datastoreSearch, str, num, isoDate, CkanError } from "./ckan";
import type { ProviderInfo, ProviderLookupResult, SourceRef } from "../types";
import { loadFixture } from "../fixtures";

/**
 * Ministry of Transport vehicle registry published on data.gov.il (private & light commercial vehicles).
 * The resource id MUST be set by the operator (GOV_VEHICLE_RESOURCE_ID) after verifying the dataset page.
 * Field names below follow the dataset's published schema; the mapping can be overridden with
 * GOV_VEHICLE_FIELD_MAP (JSON) without a code change if the schema differs.
 */
export type GovVehicleRecord = {
  plate: string;
  makeCode: number | null;
  makeName: string | null;
  modelCode: string | null;
  modelName: string | null;
  commercialName: string | null;
  trimLevel: string | null;
  year: number | null;
  engineModel: string | null;
  fuel: string | null;
  color: string | null;
  bodyStyle: string | null;
  lastTestDate: string | null;
  registrationValidUntil: string | null;
  ownershipType: string | null;
  firstOnRoad: string | null;
  pollutionGroup: number | null;
  safetyLevel: number | null;
  frontTires: string | null;
  rearTires: string | null;
  registrationInstruction: string | null;
  vinSuffix: string | null;
  sourceUpdatedAt: string | null;
};

const DEFAULT_FIELDS = {
  plate: "mispar_rechev",
  makeCode: "tozeret_cd",
  makeName: "tozeret_nm",
  modelCode: "degem_cd",
  modelName: "degem_nm",
  commercialName: "kinuy_mishari",
  trimLevel: "ramat_gimur",
  year: "shnat_yitzur",
  engineModel: "degem_manoa",
  fuel: "sug_delek_nm",
  color: "tzeva_rechev",
  bodyStyle: "sug_degem",
  lastTestDate: "mivchan_acharon_dt",
  registrationValidUntil: "tokef_dt",
  ownershipType: "baalut",
  firstOnRoad: "moed_aliya_lakvish",
  pollutionGroup: "kvutzat_zihum",
  safetyLevel: "ramat_eivzur_betihuty",
  frontTires: "zmig_kidmi",
  rearTires: "zmig_ahori",
  registrationInstruction: "horaat_rishum",
  vin: "misgeret",
};

function fieldMap(): typeof DEFAULT_FIELDS {
  try {
    const override = process.env.GOV_VEHICLE_FIELD_MAP ? (JSON.parse(process.env.GOV_VEHICLE_FIELD_MAP) as Partial<typeof DEFAULT_FIELDS>) : {};
    return { ...DEFAULT_FIELDS, ...override };
  } catch {
    return DEFAULT_FIELDS;
  }
}

export const govVehiclesProvider: ProviderInfo & { lookup(plate: string, signal?: AbortSignal): Promise<ProviderLookupResult<GovVehicleRecord>> } = {
  key: "gov_il_vehicles",
  nameHe: "מאגר כלי רכב – משרד התחבורה (data.gov.il)",
  nameEn: "Ministry of Transport vehicle registry (data.gov.il)",
  kind: "government_vehicle",
  version: "1.0.0",
  sourceUrl: "https://data.gov.il",
  datasetName: "כלי רכב פרטיים ומסחריים",
  usagePermission: "רישיון מאגרי המידע הממשלתיים הפתוחים – נדרש אזכור המקור; יש לאמת את תנאי השימוש המסחרי לפני השקה.",
  supportedDataTypes: ["identity", "specs", "registration", "test", "color"],
  isConfigured: () => !!process.env.GOV_VEHICLE_RESOURCE_ID,
  configurationHint: () => "יש להגדיר GOV_VEHICLE_RESOURCE_ID (מזהה המשאב מעמוד מאגר כלי הרכב ב-data.gov.il) ולאמת את שמות השדות.",

  async lookup(plate, signal) {
    const started = Date.now();
    const source: SourceRef = { key: this.key, name: this.nameHe, dataset: this.datasetName, url: this.sourceUrl, retrievedAt: new Date().toISOString() };
    const fixture = loadFixture<GovVehicleRecord>("gov_vehicles", plate);
    if (fixture !== undefined) return { status: fixture ? "available" : "not_found", data: fixture, durationMs: 5, source: { ...source, name: source.name + " (נתוני פיתוח)" } };
    if (!this.isConfigured()) return { status: "not_configured", data: null, durationMs: 0, source };
    const f = fieldMap();
    try {
      const { records } = await datastoreSearch(process.env.GOV_VEHICLE_RESOURCE_ID!, { [f.plate]: Number(plate) }, { limit: 1, signal });
      const r = records[0];
      if (!r) return { status: "not_found", data: null, durationMs: Date.now() - started, source };
      const vin = str(r[f.vin]);
      const data: GovVehicleRecord = {
        plate,
        makeCode: num(r[f.makeCode]),
        makeName: str(r[f.makeName]),
        modelCode: str(r[f.modelCode]),
        modelName: str(r[f.modelName]),
        commercialName: str(r[f.commercialName]),
        trimLevel: str(r[f.trimLevel]),
        year: num(r[f.year]),
        engineModel: str(r[f.engineModel]),
        fuel: str(r[f.fuel]),
        color: str(r[f.color]),
        bodyStyle: str(r[f.bodyStyle]),
        lastTestDate: isoDate(r[f.lastTestDate]),
        registrationValidUntil: isoDate(r[f.registrationValidUntil]),
        ownershipType: str(r[f.ownershipType]),
        firstOnRoad: isoDate(r[f.firstOnRoad]) ?? str(r[f.firstOnRoad]),
        pollutionGroup: num(r[f.pollutionGroup]),
        safetyLevel: num(r[f.safetyLevel]),
        frontTires: str(r[f.frontTires]),
        rearTires: str(r[f.rearTires]),
        registrationInstruction: str(r[f.registrationInstruction]),
        vinSuffix: vin ? vin.slice(-4) : null,
        sourceUpdatedAt: null,
      };
      return { status: "available", data, durationMs: Date.now() - started, source };
    } catch (e) {
      const err = e instanceof CkanError ? e : new CkanError(String(e), "network");
      return { status: "unavailable", data: null, durationMs: Date.now() - started, error: `${err.kind}: ${err.message}`, source };
    }
  },
};
