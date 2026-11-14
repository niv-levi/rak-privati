import { parsePhoneNumberFromString } from "libphonenumber-js/min";

export type PhoneParseResult = { ok: true; e164: string; national: string } | { ok: false; error: string };

const IL_MOBILE_PREFIXES = ["50", "51", "52", "53", "54", "55", "56", "57", "58", "59"];

/**
 * Accepts Israeli mobile numbers in local (05X-XXXXXXX) or international (+972 5X XXX XXXX / 9725X…) form.
 * Returns E.164 (+9725XXXXXXXX). Landlines and foreign numbers are rejected: OTP is SMS-only.
 */
export function parseIsraeliMobile(input: string): PhoneParseResult {
  const raw = (input ?? "").replace(/[\s\-().‏‎]/g, "");
  if (!raw) return { ok: false, error: "יש להזין מספר טלפון נייד" };
  let candidate = raw;
  if (candidate.startsWith("00972")) candidate = "+" + candidate.slice(2);
  else if (candidate.startsWith("972") && !candidate.startsWith("+")) candidate = "+" + candidate;
  const parsed = parsePhoneNumberFromString(candidate, "IL");
  if (!parsed || !parsed.isValid() || parsed.country !== "IL") {
    return { ok: false, error: "מספר הטלפון אינו תקין. יש להזין מספר נייד ישראלי (לדוגמה 050-1234567)" };
  }
  const national = parsed.nationalNumber; // e.g. 501234567
  if (national.length !== 9 || !IL_MOBILE_PREFIXES.includes(national.slice(0, 2))) {
    return { ok: false, error: "ניתן להתחבר רק עם מספר טלפון נייד ישראלי" };
  }
  return { ok: true, e164: parsed.number, national: "0" + national };
}

export function isValidOtp(code: string): boolean {
  return /^\d{6}$/.test(code.trim());
}
