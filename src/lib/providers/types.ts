import type { Enums } from "@/lib/database.types";

export type DataStatus = Enums<"data_status">;
export type ProviderKind = Enums<"provider_kind">;
export type ProviderStatus = Enums<"provider_status">;

export type SourceRef = {
  key: string;
  name: string;
  dataset?: string;
  url?: string;
  retrievedAt: string;      // ISO — when we fetched it
  sourceUpdatedAt?: string; // ISO — when the source says the record was updated, if known
};

/** Every imported value carries its provenance and status. */
export type AttributedField<T = string | number | boolean> = {
  value: T | null;
  status: DataStatus;
  source?: SourceRef;
  raw?: string | null;      // original value before normalization
  note?: string;            // Hebrew note shown next to the field (e.g. conflict explanation)
};

export type MileageRecord = { date: string | null; km: number; source: SourceRef; kind: "test" | "other" };
export type OwnershipRecord = { date: string | null; ownershipType: string; source: SourceRef };
export type RecallRecord = { code: string | null; title: string; description: string | null; publishedAt: string | null; source: SourceRef; applies: "vehicle" | "model" };

export type VehicleIdentification = {
  make: AttributedField<string>;
  model: AttributedField<string>;
  trim: AttributedField<string>;
  commercialName: AttributedField<string>;
  year: AttributedField<number>;
  color: AttributedField<string>;
  bodyStyle: AttributedField<string>;
  makeCode: AttributedField<number>;
  modelCode: AttributedField<string>;
};

export type VehicleSpecs = {
  engineModel: AttributedField<string>;
  engineCc: AttributedField<number>;
  fuel: AttributedField<string>;
  transmission: AttributedField<string>;
  pollutionGroup: AttributedField<number>;
  safetyLevel: AttributedField<number>;
  frontTires: AttributedField<string>;
  rearTires: AttributedField<string>;
};

export type VehicleRegistration = {
  firstOnRoad: AttributedField<string>;      // moed_aliya_lakvish (YYYY-MM)
  ownershipType: AttributedField<string>;     // baalut
  registrationValidUntil: AttributedField<string>;
  lastTestDate: AttributedField<string>;
  registrationInstruction: AttributedField<string>;
  vinSuffix: AttributedField<string>;         // last 4 chars only; never full VIN publicly
};

export type VehicleReport = {
  version: 1;
  plateMasked: string;
  fetchedAt: string;
  overallStatus: DataStatus;
  identification: VehicleIdentification;
  specs: VehicleSpecs;
  registration: VehicleRegistration;
  lastTestMileage: AttributedField<number>;
  mileageHistory: { status: DataStatus; records: MileageRecord[]; source?: SourceRef };
  ownershipHistory: { status: DataStatus; records: OwnershipRecord[]; source?: SourceRef; note: string };
  recalls: { status: DataStatus; records: RecallRecord[]; source?: SourceRef };
  warnings: { level: "info" | "warning"; text: string }[];
  conflicts: { field: string; values: { source: string; value: string }[] }[];
  missing: string[];
  sources: { key: string; name: string; status: DataStatus; durationMs: number; error?: string }[];
  disclaimer: string;
};

export type ProviderLookupResult<T> = { status: DataStatus; data: T | null; durationMs: number; error?: string; source?: SourceRef };

export interface ProviderInfo {
  key: string;
  nameHe: string;
  nameEn: string;
  kind: ProviderKind;
  version: string;
  sourceUrl?: string;
  datasetName?: string;
  usagePermission: string;
  supportedDataTypes: string[];
  /** Whether the environment has everything needed to make real calls. */
  isConfigured(): boolean;
  /** Human-readable reason when not configured. */
  configurationHint(): string;
}

export const REPORT_DISCLAIMER = "המידע מבוסס על המקורות הזמינים ואינו מהווה בדיקה מכנית, משפטית או אישור שהרכב תקין.";

export const unavailableField = <T,>(status: DataStatus = "not_found"): AttributedField<T> => ({ value: null, status });
