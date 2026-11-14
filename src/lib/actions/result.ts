export type ActionResult<T = undefined> =
  | { ok: true; data: T; message?: string }
  | { ok: false; error: string; fieldErrors?: Record<string, string>; code?: string };

export const fail = (error: string, extra?: { fieldErrors?: Record<string, string>; code?: string }): ActionResult<never> => ({ ok: false, error, ...extra });
export const succeed = <T>(data: T, message?: string): ActionResult<T> => ({ ok: true, data, message });

/** Maps Postgres/trigger error codes raised by our SQL to Hebrew messages. */
export function translateDbError(message: string | undefined): string {
  const m = message ?? "";
  if (m.includes("LISTING_LIMIT_EXCEEDED")) return "הגעת למספר המודעות המרבי לחשבון פרטי. ניתן לפרסם רכב נוסף לאחר שמודעה קיימת תסומן כנמכרה או תוסר.";
  if (m.includes("DECLARATION_REQUIRED") || m.includes("DECLARATION_INVALID")) return "נדרשת הצהרת מוכר פרטי תקפה לפני שליחת המודעה.";
  if (m.includes("LISTING_INCOMPLETE")) return "חסרים פרטים חובה במודעה (יצרן, דגם, שנה, קילומטראז׳, מחיר ועיר).";
  if (m.includes("LISTING_NEEDS_PHOTOS")) return "יש להעלות לפחות שלוש תמונות של הרכב.";
  if (m.includes("LISTING_TRANSITION_FORBIDDEN")) return "לא ניתן לבצע את הפעולה במצב הנוכחי של המודעה.";
  if (m.includes("LISTING_EXPIRED")) return "המודעה פגה. ניתן לפרסם אותה מחדש כמודעה חדשה.";
  if (m.includes("ACCOUNT_NOT_ELIGIBLE")) return "החשבון שלך אינו זכאי לפרסם כרגע. ניתן לפנות לתמיכה.";
  if (m.includes("TOO_MANY_IMAGES")) return "ניתן להעלות עד 15 תמונות.";
  if (m.includes("RATE_LIMITED")) return "ביצעת יותר מדי פעולות בזמן קצר. נסו שוב מאוחר יותר.";
  if (m.includes("AUTH_REQUIRED")) return "יש להתחבר כדי לבצע את הפעולה.";
  if (m.includes("CHANNEL_NOT_AVAILABLE")) return "המוכר לא אישר יצירת קשר בערוץ הזה.";
  if (m.includes("LISTING_NOT_AVAILABLE")) return "המודעה אינה זמינה יותר.";
  if (m.includes("ONLY_DRAFTS_CAN_BE_DELETED")) return "ניתן למחוק רק טיוטות. מודעות אחרות ניתן להסיר.";
  if (m.includes("ROLE_")) return "אין הרשאה לשינוי תפקידים.";
  if (m.includes("row-level security")) return "אין הרשאה לבצע את הפעולה.";
  return "אירעה שגיאה. נסו שוב מאוחר יותר.";
}
