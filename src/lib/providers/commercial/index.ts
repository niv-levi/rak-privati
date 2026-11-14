import "server-only";
import type { ProviderInfo } from "../types";

/**
 * Commercial providers require signed agreements and API credentials that do not exist yet.
 * The adapters expose configuration state honestly and never fabricate results.
 */
export const commercialValuationProvider: ProviderInfo = {
  key: "commercial_valuation",
  nameHe: "ספק הערכת שווי מסחרי",
  nameEn: "Commercial valuation provider",
  kind: "commercial_valuation",
  version: "0.1.0",
  usagePermission: "נדרש הסכם מסחרי עם הספק.",
  supportedDataTypes: ["valuation"],
  isConfigured: () => !!process.env.VALUATION_PROVIDER && !!process.env.VALUATION_PROVIDER_API_KEY,
  configurationHint: () => "לא מחובר. לאחר חתימת הסכם: הגדירו VALUATION_PROVIDER ו-VALUATION_PROVIDER_API_KEY וממשו את המתאם בקובץ זה.",
};

export const commercialHistoryProvider: ProviderInfo = {
  key: "commercial_history",
  nameHe: "ספק היסטוריית רכב מורחבת",
  nameEn: "Extended vehicle-history provider",
  kind: "commercial_history",
  version: "0.1.0",
  usagePermission: "נדרש הסכם מסחרי עם הספק.",
  supportedDataTypes: ["accident_history", "insurance_history"],
  isConfigured: () => !!process.env.HISTORY_PROVIDER && !!process.env.HISTORY_PROVIDER_API_KEY,
  configurationHint: () => "לא מחובר. לאחר חתימת הסכם: הגדירו HISTORY_PROVIDER ו-HISTORY_PROVIDER_API_KEY וממשו את המתאם בקובץ זה.",
};

export const smsProvider: ProviderInfo = {
  key: "supabase_phone_auth",
  nameHe: "אימות SMS (Supabase Phone Auth)",
  nameEn: "SMS OTP via Supabase Phone Auth",
  kind: "sms",
  version: "1.0.0",
  sourceUrl: "https://supabase.com/docs/guides/auth/phone-login",
  usagePermission: "לפי ספק ה-SMS שנבחר (Twilio / MessageBird / Vonage / Textlocal).",
  supportedDataTypes: ["otp"],
  isConfigured: () => process.env.AUTH_SMS_CONFIGURED === "true",
  configurationHint: () => "הגדירו ספק SMS ב-Supabase (Authentication → Providers → Phone) וסמנו AUTH_SMS_CONFIGURED=true.",
};

export const emailProvider: ProviderInfo = {
  key: "email_provider",
  nameHe: "ספק דוא״ל",
  nameEn: "Email provider",
  kind: "email",
  version: "0.1.0",
  usagePermission: "אופציונלי.",
  supportedDataTypes: ["transactional_email"],
  isConfigured: () => !!process.env.EMAIL_PROVIDER && !!process.env.EMAIL_API_KEY && !!process.env.EMAIL_FROM,
  configurationHint: () => "הגדירו EMAIL_PROVIDER, EMAIL_API_KEY ו-EMAIL_FROM כדי לאפשר התראות בדוא״ל.",
};

export const analyticsProvider: ProviderInfo = {
  key: "analytics_provider",
  nameHe: "אנליטיקה פנימית",
  nameEn: "Internal analytics",
  kind: "analytics",
  version: "1.0.0",
  usagePermission: "אירועים אנונימיים בלבד.",
  supportedDataTypes: ["events"],
  isConfigured: () => true,
  configurationHint: () => "פעיל (טבלת analytics_events). ניתן לחבר ספק חיצוני דרך NEXT_PUBLIC_ANALYTICS_PROVIDER.",
};
