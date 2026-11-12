export const siteConfig = {
  name: "רק פרטי",
  nameEn: "Rak Privati",
  tagline: "רכב קונים מאנשים. לא מסוחרים.",
  description:
    "לוח רכבים שנבנה במיוחד למכירה בין אנשים פרטיים. מוצאים רכב, בודקים את המידע ומדברים ישירות עם המוכר.",
  url: process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",
  locale: "he-IL",
  supportEmail: process.env.NEXT_PUBLIC_SUPPORT_EMAIL ?? "",
  accessibility: {
    email: process.env.NEXT_PUBLIC_ACCESSIBILITY_CONTACT_EMAIL ?? "",
    phone: process.env.NEXT_PUBLIC_ACCESSIBILITY_CONTACT_PHONE ?? "",
  },
} as const;

export type NavItem = { href: string; label: string; description?: string };

export const mainNav: NavItem[] = [
  { href: "/cars", label: "חיפוש רכב" },
  { href: "/vehicle-check", label: "בדיקת רכב" },
  { href: "/valuation", label: "הערכת שווי" },
  { href: "/how-it-works", label: "איך זה עובד" },
];

export const footerNav: { title: string; items: NavItem[] }[] = [
  {
    title: "המוצר",
    items: [
      { href: "/cars", label: "חיפוש רכב" },
      { href: "/sell", label: "פרסום רכב" },
      { href: "/vehicle-check", label: "בדיקת רכב לפי מספר רישוי" },
      { href: "/valuation", label: "הערכת שווי" },
      { href: "/how-it-works", label: "איך זה עובד" },
    ],
  },
  {
    title: "רק פרטי",
    items: [
      { href: "/about", label: "אודות" },
      { href: "/private-seller-policy", label: "מדיניות מוכרים פרטיים" },
      { href: "/data-sources", label: "מקורות המידע" },
      { href: "/help", label: "מרכז העזרה" },
      { href: "/faq", label: "שאלות נפוצות" },
      { href: "/contact", label: "יצירת קשר" },
    ],
  },
  {
    title: "משפטי",
    items: [
      { href: "/terms", label: "תנאי שימוש" },
      { href: "/privacy", label: "מדיניות פרטיות" },
      { href: "/cookies", label: "מדיניות עוגיות" },
      { href: "/accessibility", label: "הצהרת נגישות" },
    ],
  },
];

export const accountNav: NavItem[] = [
  { href: "/account", label: "סקירה" },
  { href: "/account/listings", label: "המודעות שלי" },
  { href: "/account/favorites", label: "רכבים שמורים" },
  { href: "/account/searches", label: "חיפושים שמורים" },
  { href: "/account/vehicle-checks", label: "דוחות רכב" },
  { href: "/account/notifications", label: "התראות" },
  { href: "/account/profile", label: "פרופיל" },
  { href: "/account/security", label: "אבטחה" },
  { href: "/account/delete", label: "מחיקת חשבון" },
];

export const adminNav: NavItem[] = [
  { href: "/admin", label: "לוח בקרה" },
  { href: "/admin/listings", label: "מודעות לאישור" },
  { href: "/admin/users", label: "משתמשים" },
  { href: "/admin/reports", label: "דיווחים" },
  { href: "/admin/vehicle-data", label: "מקורות מידע" },
  { href: "/admin/catalog", label: "קטלוג רכבים" },
  { href: "/admin/valuations", label: "הערכות שווי" },
  { href: "/admin/audit", label: "יומן ביקורת" },
  { href: "/admin/settings", label: "הגדרות" },
];
