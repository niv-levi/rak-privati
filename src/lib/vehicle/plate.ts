/**
 * Israeli vehicle registration numbers: 7 digits (older) or 8 digits (since 2017).
 * Display groups: 12-345-67 and 123-45-678.
 */
export type PlateParseResult = { ok: true; plate: string; formatted: string } | { ok: false; error: string };

export function normalizePlate(input: string): string {
  return (input ?? "").replace(/[^0-9]/g, "");
}

export function parsePlate(input: string): PlateParseResult {
  const digits = normalizePlate(input);
  if (!digits) return { ok: false, error: "יש להזין מספר רישוי" };
  if (!/^\d{7,8}$/.test(digits)) return { ok: false, error: "מספר רישוי ישראלי מכיל 7 או 8 ספרות" };
  if (/^0+$/.test(digits)) return { ok: false, error: "מספר הרישוי אינו תקין" };
  return { ok: true, plate: digits, formatted: formatPlateDigits(digits) };
}

export function formatPlateDigits(digits: string): string {
  if (digits.length === 7) return `${digits.slice(0, 2)}-${digits.slice(2, 5)}-${digits.slice(5)}`;
  if (digits.length === 8) return `${digits.slice(0, 3)}-${digits.slice(3, 5)}-${digits.slice(5)}`;
  return digits;
}

export function maskPlateDigits(digits: string): string {
  const d = normalizePlate(digits);
  if (d.length < 4) return "•••";
  const masked = "•".repeat(d.length - 2) + d.slice(-2);
  return formatPlateDigits(masked);
}
