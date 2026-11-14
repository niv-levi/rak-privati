import { z } from "zod";

const currentYear = new Date().getFullYear();
const optionalText = (max: number) => z.string().trim().max(max).optional().or(z.literal("")).transform((v) => (v ? v : null));

export const vehicleStepSchema = z.object({
  make_id: z.string().uuid({ error: "יש לבחור יצרן" }),
  model_id: z.string().uuid({ error: "יש לבחור דגם" }),
  trim_id: z.string().uuid().optional().or(z.literal("")).transform((v) => v || null),
  trim_name: optionalText(80),
  year: z.coerce.number().int().min(1980, "שנה לא תקינה").max(currentYear + 1, "שנה לא תקינה"),
  mileage_km: z.coerce.number().int().min(0, "קילומטראז׳ לא תקין").max(2_000_000, "קילומטראז׳ לא תקין"),
  ownership_count_declared: z.coerce.number().int().min(1, "יש לבחור מספר ידיים").max(20),
  ownership_type: z.enum(["private", "leasing", "rental", "company", "other"], { error: "יש לבחור סוג בעלות" }),
  fuel_type: z.enum(["petrol", "diesel", "hybrid", "plug_in_hybrid", "electric", "lpg", "other"], { error: "יש לבחור סוג דלק" }),
  transmission: z.enum(["automatic", "manual", "other"], { error: "יש לבחור תיבת הילוכים" }),
  engine_cc: z.coerce.number().int().min(0).max(10000).optional().or(z.nan().transform(() => undefined)),
  body_style: z.enum(["sedan", "hatchback", "suv", "crossover", "station_wagon", "coupe", "convertible", "mpv", "minivan", "pickup", "other"]).optional().or(z.literal("")).transform((v) => v || null),
  color: optionalText(40),
  first_registration_date: z.string().regex(/^\d{4}-\d{2}(-\d{2})?$/).optional().or(z.literal("")).transform((v) => (v ? (v.length === 7 ? `${v}-01` : v) : null)),
});

export const saleStepSchema = z.object({
  price: z.coerce.number().int().min(1000, "המחיר המינימלי הוא 1,000 ₪").max(5_000_000, "מחיר לא תקין"),
  city_id: z.string().uuid({ error: "יש לבחור עיר" }),
  neighborhood: optionalText(80),
  condition: z.enum(["excellent", "very_good", "good", "fair", "needs_repair"], { error: "יש לבחור את מצב הרכב" }),
});

export const conditionStepSchema = z.object({
  maintenance_history: optionalText(2000),
  accident_declared: z.enum(["yes", "no"], { error: "יש לציין אם הרכב היה מעורב בתאונה" }).transform((v) => v === "yes"),
  accident_details: optionalText(1000),
  body_repairs_declared: z.enum(["yes", "no"], { error: "יש לציין אם בוצעו תיקוני פחחות" }).transform((v) => v === "yes"),
  body_repair_details: optionalText(1000),
  equipment: z.array(z.string().max(40)).max(30).default([]),
  description: z.string().trim().min(20, "התיאור צריך להכיל לפחות 20 תווים").max(4000, "התיאור ארוך מדי"),
}).superRefine((d, ctx) => {
  if (d.accident_declared && !d.accident_details) ctx.addIssue({ code: "custom", path: ["accident_details"], message: "יש לפרט את נסיבות התאונה והתיקון" });
  const bad = /(?:https?:\/\/|www\.)/i.test(d.description) || /0\d{1,2}[-\s]?\d{3}[-\s]?\d{4}/.test(d.description);
  if (bad) ctx.addIssue({ code: "custom", path: ["description"], message: "אין לכלול קישורים או מספרי טלפון בתיאור. פרטי הקשר מוצגים דרך המערכת בלבד." });
  const dealerWords = /(מגרש|סוחר|מלאי|מימון|טרייד[- ]?אין|trade[- ]?in|אחריות\s+לשנה|רכבים\s+נוספים|מבחר\s+רכבים)/i;
  if (dealerWords.test(d.description)) ctx.addIssue({ code: "custom", path: ["description"], message: "התיאור כולל ביטויים שמתאימים לפרסום מסחרי. רק פרטי מיועד למוכרים פרטיים בלבד." });
});

export const contactStepSchema = z.object({
  display_name: z.string().trim().min(2, "יש להזין שם לתצוגה").max(60),
  contact_phone_opt_in: z.boolean(),
  contact_whatsapp_opt_in: z.boolean(),
  contact_hours: optionalText(120),
}).refine((d) => d.contact_phone_opt_in || d.contact_whatsapp_opt_in, { message: "יש לאשר לפחות ערוץ קשר אחד כדי שקונים יוכלו לפנות אליך", path: ["contact_phone_opt_in"] });

export const officialConfirmSchema = z.object({
  confirmed: z.boolean(),
  discrepancy_notes: optionalText(1000),
}).refine((d) => d.confirmed || d.discrepancy_notes, { message: "אם הפרטים אינם נכונים, יש לציין מה שגוי", path: ["discrepancy_notes"] });

export type VehicleStepInput = z.input<typeof vehicleStepSchema>;
export type VehicleStepOutput = z.output<typeof vehicleStepSchema>;
export type SaleStepInput = z.input<typeof saleStepSchema>;
export type SaleStepOutput = z.output<typeof saleStepSchema>;
export type ConditionStepInput = z.input<typeof conditionStepSchema>;
export type ConditionStepOutput = z.output<typeof conditionStepSchema>;
export type ContactStepInput = z.input<typeof contactStepSchema>;
export type ContactStepOutput = z.output<typeof contactStepSchema>;

export const WIZARD_STEPS = [
  { key: "plate", title: "מספר רישוי" },
  { key: "official", title: "אישור פרטי הרכב" },
  { key: "vehicle", title: "פרטי הרכב" },
  { key: "sale", title: "פרטי המכירה" },
  { key: "photos", title: "תמונות" },
  { key: "condition", title: "מצב הרכב" },
  { key: "contact", title: "יצירת קשר" },
  { key: "declaration", title: "הצהרת מוכר פרטי" },
  { key: "preview", title: "תצוגה מקדימה ושליחה" },
] as const;
export type WizardStepKey = (typeof WIZARD_STEPS)[number]["key"];
