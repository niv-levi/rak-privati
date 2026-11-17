import { describe, it, expect } from "vitest";
import { buildReport } from "@/features/vehicle-check/service";
import { REPORT_DISCLAIMER } from "@/lib/providers/types";
import { devVehicles, devHistory, devRecalls } from "@/lib/providers/fixtures/data";

const src = (key: string) => ({ key, name: key, retrievedAt: "2026-11-01T00:00:00.000Z" });
const vehicle = (plate: keyof typeof devVehicles) => ({ status: "available" as const, data: { ...devVehicles[plate] } as never, durationMs: 10, source: src("gov_il_vehicles") });
const notConfigured = { status: "not_configured" as const, data: null, durationMs: 0 };

describe("vehicle report builder", () => {
  it("builds a full report with source attribution on every available field", () => {
    const r = buildReport("1234567", {
      vehicle: vehicle("1234567"),
      history: { status: "available", data: { mileage: [...devHistory["1234567"].mileage], ownership: [...devHistory["1234567"].ownership] }, durationMs: 5, source: src("gov_il_vehicle_history") },
      recalls: { status: "not_found", data: [], durationMs: 5, source: src("gov_il_recalls") },
    });
    expect(r.plateMasked).toBe("••-•••-67");
    expect(r.identification.make).toMatchObject({ value: "טויוטה", status: "available" });
    expect(r.identification.make.source?.key).toBe("gov_il_vehicles");
    expect(r.lastTestMileage.value).toBe(102300);
    expect(r.lastTestMileage.note).toMatch(/אינה בהכרח הנסועה הנוכחית/);
    expect(r.mileageHistory.records).toHaveLength(5);
    expect(r.disclaimer).toBe(REPORT_DISCLAIMER);
    expect(r.overallStatus).toBe("partial"); // recalls not found
  });

  it("marks everything as not configured when no source is configured, without inventing data", () => {
    const r = buildReport("1234567", { vehicle: notConfigured, history: notConfigured, recalls: notConfigured });
    expect(r.overallStatus).toBe("not_configured");
    expect(r.identification.make).toEqual({ value: null, status: "not_configured" });
    expect(r.mileageHistory.records).toEqual([]);
    expect(r.missing).toContain("זיהוי הרכב ונתונים טכניים");
  });

  it("reports a provider timeout as unavailable and keeps other sections", () => {
    const r = buildReport("8888888", {
      vehicle: vehicle("8888888"),
      history: { status: "unavailable", data: null, durationMs: 8000, error: "timeout: CKAN request timed out" },
      recalls: notConfigured,
    });
    expect(r.identification.make.value).toBe("קיה");
    expect(r.mileageHistory.status).toBe("unavailable");
    expect(r.sources.find((s) => s.key === "gov_il_vehicle_history")?.error).toMatch(/timeout/);
    expect(r.overallStatus).toBe("partial");
  });

  it("flags conflicting data and decreasing mileage", () => {
    const r = buildReport("7654321", {
      vehicle: { ...vehicle("7654321"), data: { ...devVehicles["7654321"], year: 2015 } as never },
      history: { status: "available", data: { mileage: [{ date: "2022-01-01", km: 120000 }, { date: "2023-01-01", km: 90000 }], ownership: [...devHistory["7654321"].ownership] }, durationMs: 5, source: src("h") },
      recalls: { status: "available", data: devRecalls["7654321"].map((x) => ({ ...x, source: src("r") })), durationMs: 5, source: src("r") },
    });
    expect(r.conflicts[0]?.field).toBe("שנת ייצור");
    expect(r.warnings.some((w) => /ירידה בנסועה/.test(w.text))).toBe(true);
    expect(r.warnings.some((w) => /ליסינג/.test(w.text))).toBe(true);
    expect(r.warnings.some((w) => /ריקול/.test(w.text))).toBe(true);
    expect(r.ownershipHistory.note).toMatch(/אינו בהכרח מספר הבעלים/);
  });

  it("never claims accident history and always lists it as missing", () => {
    const r = buildReport("1234567", { vehicle: vehicle("1234567"), history: notConfigured, recalls: notConfigured });
    expect(r.missing.some((m) => m.includes("תאונות"))).toBe(true);
    expect(JSON.stringify(r)).not.toMatch(/בעלות מאומתת|ownership verified/i);
  });
});
