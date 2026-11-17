/**
 * Formatting helpers for Hebrew/RTL UI.
 * All numeric output is wrapped by callers in `.num` (LTR isolation) where it is rendered inline.
 */

const ilsFormatter = new Intl.NumberFormat("he-IL", { style: "currency", currency: "ILS", maximumFractionDigits: 0 });
const numberFormatter = new Intl.NumberFormat("he-IL", { maximumFractionDigits: 0 });
const dateFormatter = new Intl.DateTimeFormat("he-IL", { day: "numeric", month: "long", year: "numeric" });
const shortDateFormatter = new Intl.DateTimeFormat("he-IL", { day: "2-digit", month: "2-digit", year: "numeric" });
const dateTimeFormatter = new Intl.DateTimeFormat("he-IL", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });

export function formatPrice(value: number | null | undefined): string {
  if (value == null || Number.isNaN(value)) return "—";
  return ilsFormatter.format(value);
}

export function formatNumber(value: number | null | undefined): string {
  if (value == null || Number.isNaN(value)) return "—";
  return numberFormatter.format(value);
}

export function formatKm(value: number | null | undefined): string {
  if (value == null) return "—";
  return `${numberFormatter.format(value)} ק״מ`;
}

export function formatDate(value: string | Date | null | undefined): string {
  if (!value) return "—";
  const d = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(d.getTime())) return "—";
  return dateFormatter.format(d);
}

export function formatShortDate(value: string | Date | null | undefined): string {
  if (!value) return "—";
  const d = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(d.getTime())) return "—";
  return shortDateFormatter.format(d);
}

export function formatDateTime(value: string | Date | null | undefined): string {
  if (!value) return "—";
  const d = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(d.getTime())) return "—";
  return dateTimeFormatter.format(d);
}

export function formatRelativeDays(value: string | Date | null | undefined): string {
  if (!value) return "";
  const d = typeof value === "string" ? new Date(value) : value;
  const diff = Math.floor((Date.now() - d.getTime()) / 86_400_000);
  if (diff <= 0) return "פורסם היום";
  if (diff === 1) return "פורסם אתמול";
  if (diff < 7) return `פורסם לפני ${diff} ימים`;
  if (diff < 30) return `פורסם לפני ${Math.floor(diff / 7)} שבועות`;
  return `פורסם ב־${shortDateFormatter.format(d)}`;
}

/** 7 or 8 digit Israeli plate -> "12-345-67" / "123-45-678" */
export function formatPlate(plate: string | null | undefined): string {
  if (!plate) return "—";
  const digits = plate.replace(/\D/g, "");
  if (digits.length === 7) return `${digits.slice(0, 2)}-${digits.slice(2, 5)}-${digits.slice(5)}`;
  if (digits.length === 8) return `${digits.slice(0, 3)}-${digits.slice(3, 5)}-${digits.slice(5)}`;
  return digits;
}

/** Public masking: keep last 2 digits only. */
export function maskPlate(plate: string | null | undefined): string {
  if (!plate) return "—";
  const digits = plate.replace(/\D/g, "");
  if (digits.length < 4) return "•••";
  const masked = "•".repeat(digits.length - 2) + digits.slice(-2);
  return masked.length === 7
    ? `${masked.slice(0, 2)}-${masked.slice(2, 5)}-${masked.slice(5)}`
    : masked.length === 8
      ? `${masked.slice(0, 3)}-${masked.slice(3, 5)}-${masked.slice(5)}`
      : masked;
}

/** +972501234567 -> 050-123-4567 */
export function formatIsraeliPhone(e164: string | null | undefined): string {
  if (!e164) return "—";
  const digits = e164.replace(/\D/g, "");
  const local = digits.startsWith("972") ? "0" + digits.slice(3) : digits;
  if (local.length === 10) return `${local.slice(0, 3)}-${local.slice(3, 6)}-${local.slice(6)}`;
  if (local.length === 9) return `${local.slice(0, 2)}-${local.slice(2, 5)}-${local.slice(5)}`;
  return local;
}

/** 050-123-4567 -> 050-•••-••67 (prefix and last two digits only). */
export function maskPhone(e164: string | null | undefined): string {
  if (!e164) return "—";
  const f = formatIsraeliPhone(e164);
  const digits = f.replace(/\D/g, "");
  if (digits.length < 6) return "•••";
  let seen = 0;
  const keepHead = 3;
  const keepTail = digits.length - 2;
  return f.replace(/\d/g, (d) => {
    const i = seen++;
    return i < keepHead || i >= keepTail ? d : "•";
  });
}

export function pluralHe(count: number, singular: string, plural: string): string {
  return count === 1 ? singular : plural;
}
