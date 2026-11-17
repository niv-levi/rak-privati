"use server";
import { z } from "zod";
import { createSupabaseServerClient, getCurrentUser, createSupabaseAdminClient } from "@/lib/supabase/server";
import { rateLimit } from "@/lib/security/rate-limit";
import { getClientIp } from "@/lib/security/request";
import { hashIp } from "@/lib/security/hash";
import { fail, succeed, type ActionResult } from "@/lib/actions/result";

const schema = z.object({
  topic: z.enum(["support", "accessibility", "privacy", "report_dealer", "legal", "other"]),
  name: z.string().trim().max(80).optional(),
  email: z.string().trim().email("כתובת דוא״ל לא תקינה").max(160).optional().or(z.literal("")),
  phone: z.string().trim().max(20).optional(),
  message: z.string().trim().min(10, "ההודעה קצרה מדי (לפחות 10 תווים)").max(4000),
  website: z.string().optional(), // honeypot
});

export async function sendContactMessageAction(_prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  const parsed = schema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const i of parsed.error.issues) fieldErrors[String(i.path[0])] = i.message;
    return fail("יש לתקן את השדות המסומנים", { fieldErrors });
  }
  if (parsed.data.website) return succeed(undefined, "תודה, ההודעה התקבלה"); // bot trap: silently drop
  const [user, supabase] = await Promise.all([getCurrentUser(), createSupabaseServerClient()]);
  const ip = await getClientIp();
  if (!(await rateLimit("contact_form", user?.id ?? ip ?? "anon", 5, 3600))) return fail("נשלחו יותר מדי הודעות. נסו שוב מאוחר יותר.");
  if (!parsed.data.email && !parsed.data.phone && !user) return fail("יש להשאיר דוא״ל או טלפון כדי שנוכל לחזור אליכם", { fieldErrors: { email: "נדרש דוא״ל או טלפון" } });
  const client = supabase ?? createSupabaseAdminClient();
  if (!client) return fail("השירות אינו זמין כרגע בסביבה זו.");
  const { error } = await client.from("contact_messages").insert({ user_id: user?.id ?? null, topic: parsed.data.topic, name: parsed.data.name || null, email: parsed.data.email || null, phone: parsed.data.phone || null, message: parsed.data.message, ip_hash: hashIp(ip) });
  if (error) return fail("שליחת ההודעה נכשלה. נסו שוב.");
  return succeed(undefined, "תודה, ההודעה התקבלה. נחזור אליכם בהקדם.");
}
