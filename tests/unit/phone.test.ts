import { describe, it, expect } from "vitest";
import { parseIsraeliMobile, isValidOtp } from "@/lib/auth/phone";

describe("Israeli mobile validation and normalization", () => {
  it.each([
    ["050-1234567", "+972501234567"],
    ["0501234567", "+972501234567"],
    ["+972 50 123 4567", "+972501234567"],
    ["972501234567", "+972501234567"],
    ["00972-54-765-4321", "+972547654321"],
    ["(052) 333-4444", "+972523334444"],
  ])("normalizes %s to E.164", (input, e164) => {
    const r = parseIsraeliMobile(input);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.e164).toBe(e164);
  });

  it.each(["", "abc", "03-1234567", "+14155552671", "05012345", "0501234567890", "+972312345678"])("rejects %s", (input) => {
    expect(parseIsraeliMobile(input).ok).toBe(false);
  });

  it("returns Hebrew error messages", () => {
    const r = parseIsraeliMobile("03-1234567");
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toMatch(/נייד/);
  });

  it("validates 6-digit OTP codes only", () => {
    expect(isValidOtp("123456")).toBe(true);
    expect(isValidOtp(" 123456 ")).toBe(true);
    expect(isValidOtp("12345")).toBe(false);
    expect(isValidOtp("12345a")).toBe(false);
  });
});
