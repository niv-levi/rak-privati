import { describe, it, expect } from "vitest";
import { parsePlate, normalizePlate, maskPlateDigits, formatPlateDigits } from "@/lib/vehicle/plate";
import { formatIsraeliPhone, maskPhone, maskPlate, formatPlate, formatPrice } from "@/lib/format";

describe("registration number handling", () => {
  it("normalizes separators", () => expect(normalizePlate("12-345-67")).toBe("1234567"));
  it("accepts 7 and 8 digit plates", () => {
    expect(parsePlate("12-345-67")).toEqual({ ok: true, plate: "1234567", formatted: "12-345-67" });
    expect(parsePlate("123 45 678")).toEqual({ ok: true, plate: "12345678", formatted: "123-45-678" });
  });
  it.each(["", "123456", "123456789", "0000000", "abcdefg"])("rejects %s", (p) => expect(parsePlate(p).ok).toBe(false));
  it("masks all but the last two digits", () => {
    expect(maskPlateDigits("1234567")).toBe("••-•••-67");
    expect(maskPlateDigits("12345678")).toBe("•••-••-•78");
    expect(maskPlate("1234567")).toBe("••-•••-67");
    expect(maskPlateDigits("1234567")).not.toContain("12345");
  });
  it("formats display groups", () => {
    expect(formatPlateDigits("1234567")).toBe("12-345-67");
    expect(formatPlate("12345678")).toBe("123-45-678");
  });
});

describe("phone formatting", () => {
  it("formats E.164 for display", () => expect(formatIsraeliPhone("+972501234567")).toBe("050-123-4567"));
  it("masks the middle of the number", () => {
    const m = maskPhone("+972501234567");
    expect(m.startsWith("050")).toBe(true);
    expect(m.endsWith("67")).toBe(true);
    expect(m).not.toContain("1234");
  });
  it("formats prices in ILS", () => expect(formatPrice(85000)).toMatch(/85,000/));
});
