import type { Enums } from "@/lib/database.types";

export const fuelLabels: Record<Enums<"fuel_type">, string> = {
  petrol: "בנזין", diesel: "דיזל", hybrid: "היברידי", plug_in_hybrid: "היברידי נטען", electric: "חשמלי", lpg: "גפ״מ", other: "אחר",
};
export const transmissionLabels: Record<Enums<"transmission_type">, string> = { automatic: "אוטומטית", manual: "ידנית", other: "אחר" };
export const bodyStyleLabels: Record<Enums<"body_style">, string> = {
  sedan: "סדאן", hatchback: "האצ׳בק", suv: "ג׳יפ / SUV", crossover: "קרוסאובר", station_wagon: "סטיישן", coupe: "קופה", convertible: "קבריולה", mpv: "MPV", minivan: "מיניוואן", pickup: "טנדר", other: "אחר",
};
export const conditionLabels: Record<Enums<"vehicle_condition">, string> = {
  excellent: "מצוין", very_good: "טוב מאוד", good: "טוב", fair: "סביר", needs_repair: "דורש תיקון",
};
export const ownershipLabels: Record<Enums<"ownership_type">, string> = { private: "פרטי", leasing: "ליסינג", rental: "השכרה", company: "חברה", other: "אחר" };
export const listingStatusLabels: Record<Enums<"listing_status">, string> = {
  draft: "טיוטה", pending_review: "ממתינה לאישור", needs_correction: "נדרש תיקון", active: "פעילה", paused: "מושהית", rejected: "נדחתה", sold: "נמכרה", expired: "פגה", removed: "הוסרה",
};
export const categoryLabels: Record<string, string> = {
  city: "רכבי עיר", family: "משפחתיים", suv: "פנאי ו-SUV", executive: "מנהלים", electric: "חשמליים", luxury: "יוקרה", mpv: "משפחתיים גדולים",
};
export const reportReasonLabels: Record<Enums<"report_reason">, string> = {
  suspected_dealer: "חשד שמדובר בסוחר או מגרש", wrong_info: "פרטים לא נכונים", sold_already: "הרכב כבר נמכר", scam: "חשד להונאה", offensive: "תוכן פוגעני", duplicate: "מודעה כפולה", other: "אחר",
};
export const flagTypeLabels: Record<Enums<"flag_type">, string> = {
  duplicate_plate: "מספר רישוי שפורסם מחשבון אחר", duplicate_image: "תמונה זהה למודעה אחרת", similar_description: "תיאור דומה למודעה אחרת", listing_frequency: "תדירות פרסום גבוהה",
  related_accounts: "חשבונות קשורים מפרסמים", user_report: "דיווח משתמש", limit_exceeded: "חריגה ממגבלת מודעות", dealer_pattern: "דפוס פרסום של סוחר", manual: "סימון ידני",
};
export const roleLabels: Record<Enums<"user_role">, string> = { super_admin: "מנהל ראשי", moderator: "מנהל תוכן", support: "תמיכה", data_manager: "מנהל נתונים", analyst: "אנליסט" };
export const accountStatusLabels: Record<Enums<"account_status">, string> = { active: "פעיל", warned: "קיבל אזהרה", suspended: "מושעה", blocked: "חסום", deleted: "נמחק" };
export const dataStatusLabels: Record<Enums<"data_status">, string> = {
  available: "זמין", partial: "מידע חלקי", not_found: "לא נמצא", needs_review: "דורש בדיקה נוספת", unavailable: "שירות חיצוני לא זמין", not_configured: "המקור לא הוגדר",
};
export const providerStatusLabels: Record<Enums<"provider_status">, string> = { configured: "מחובר", not_configured: "לא הוגדר", error: "שגיאה", disabled: "מושבת" };
export const notificationTypeLabels: Record<Enums<"notification_type">, string> = {
  listing_approved: "מודעה אושרה", listing_rejected: "מודעה נדחתה", listing_needs_correction: "נדרש תיקון", listing_paused: "מודעה הושהתה", listing_removed: "מודעה הוסרה",
  new_inquiry: "פנייה חדשה", listing_expiring: "מודעה עומדת לפוג", listing_expired: "מודעה פגה", price_reduced: "ירידת מחיר", saved_search_match: "התאמה לחיפוש שמור", security: "אבטחה", account: "חשבון", system: "מערכת",
};

export const equipmentOptions: { value: string; label: string }[] = [
  { value: "cruise_control", label: "בקרת שיוט" }, { value: "adaptive_cruise", label: "בקרת שיוט אדפטיבית" }, { value: "reverse_camera", label: "מצלמת רוורס" },
  { value: "parking_sensors", label: "חיישני חניה" }, { value: "sunroof", label: "גג נפתח" }, { value: "leather", label: "ריפוד עור" },
  { value: "heated_seats", label: "מושבים מחוממים" }, { value: "android_carplay", label: "Android Auto / CarPlay" }, { value: "keyless", label: "התנעה ללא מפתח" },
  { value: "lane_assist", label: "מערכת סטייה מנתיב" }, { value: "blind_spot", label: "ניטור שטח מת" }, { value: "alloy_wheels", label: "חישוקי סגסוגת" },
  { value: "tow_hook", label: "וו גרירה" }, { value: "led_lights", label: "פנסי LED" }, { value: "four_wheel_drive", label: "הנעה כפולה" },
];
