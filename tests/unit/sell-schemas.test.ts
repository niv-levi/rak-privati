import { describe, it, expect } from "vitest";
import { conditionStepSchema, contactStepSchema, saleStepSchema, vehicleStepSchema, officialConfirmSchema, WIZARD_STEPS } from "@/features/sell/schemas";

const UUID = "11111111-1111-4111-8111-111111111111";
const goodCondition = { maintenance_history: "", accident_declared: "no", accident_details: "", body_repairs_declared: "no", body_repair_details: "", equipment: [], description: "רכב שמור מאוד, טיפולים במוסך מורשה, יד ראשונה." };

describe("publishing wizard validation", () => {
  it("has a declaration step before the preview step", () => {
    const keys = WIZARD_STEPS.map((s) => s.key);
    expect(keys.indexOf("declaration")).toBeLessThan(keys.indexOf("preview"));
    expect(keys[0]).toBe("plate");
  });

  it("accepts a valid vehicle step and coerces numbers", () => {
    const r = vehicleStepSchema.safeParse({ make_id: UUID, model_id: UUID, year: "2021", mileage_km: "45000", ownership_count_declared: "1", ownership_type: "private", fuel_type: "hybrid", transmission: "automatic", first_registration_date: "2021-04" });
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.data.year).toBe(2021);
      expect(r.data.first_registration_date).toBe("2021-04-01");
    }
  });

  it("rejects implausible years and mileage", () => {
    expect(vehicleStepSchema.safeParse({ make_id: UUID, model_id: UUID, year: "1950", mileage_km: "1", ownership_count_declared: "1", ownership_type: "private", fuel_type: "petrol", transmission: "manual" }).success).toBe(false);
    expect(vehicleStepSchema.safeParse({ make_id: UUID, model_id: UUID, year: "2020", mileage_km: "-5", ownership_count_declared: "1", ownership_type: "private", fuel_type: "petrol", transmission: "manual" }).success).toBe(false);
  });

  it("enforces minimum price and a city", () => {
    expect(saleStepSchema.safeParse({ price: "500", city_id: UUID, condition: "good" }).success).toBe(false);
    expect(saleStepSchema.safeParse({ price: "85000", city_id: "", condition: "good" }).success).toBe(false);
    expect(saleStepSchema.safeParse({ price: "85000", city_id: UUID, condition: "good" }).success).toBe(true);
  });

  it("requires accident details when an accident is declared", () => {
    const r = conditionStepSchema.safeParse({ ...goodCondition, accident_declared: "yes" });
    expect(r.success).toBe(false);
  });

  it("blocks phone numbers and links in the description", () => {
    expect(conditionStepSchema.safeParse({ ...goodCondition, description: "רכב מעולה, להתקשר 050-1234567 בכל שעה" }).success).toBe(false);
    expect(conditionStepSchema.safeParse({ ...goodCondition, description: "פרטים נוספים באתר www.example.com עכשיו" }).success).toBe(false);
  });

  it("blocks dealer language in the description (private-only rule)", () => {
    for (const d of ["מגרש רכבים בהרצליה, מבחר רכבים במלאי", "אפשרות טרייד-אין ומימון עד 100%", "יש לנו רכבים נוספים, אחריות לשנה"]) {
      expect(conditionStepSchema.safeParse({ ...goodCondition, description: d + " ".repeat(5) + "תיאור נוסף ארוך" }).success).toBe(false);
    }
    expect(conditionStepSchema.safeParse(goodCondition).success).toBe(true);
  });

  it("requires at least one contact channel", () => {
    expect(contactStepSchema.safeParse({ display_name: "דנה", contact_phone_opt_in: false, contact_whatsapp_opt_in: false }).success).toBe(false);
    expect(contactStepSchema.safeParse({ display_name: "דנה", contact_phone_opt_in: false, contact_whatsapp_opt_in: true }).success).toBe(true);
  });

  it("requires a discrepancy note when official data is disputed", () => {
    expect(officialConfirmSchema.safeParse({ confirmed: false, discrepancy_notes: "" }).success).toBe(false);
    expect(officialConfirmSchema.safeParse({ confirmed: false, discrepancy_notes: "שנת הייצור שגויה" }).success).toBe(true);
    expect(officialConfirmSchema.safeParse({ confirmed: true }).success).toBe(true);
  });
});
