"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { parseIsraeliMobile, isValidOtp } from "@/lib/auth/phone";
import { rateLimit } from "@/lib/security/rate-limit";
import { getClientIp, getUserAgent } from "@/lib/security/request";
import { hashIp } from "@/lib/security/hash";
import { track } from "@/lib/analytics/track";
import { recordConsent, hasCurrentConsent } from "@/features/consents/service";
import type { ActionResult } from "@/lib/actions/result";

const PENDING_COOKIE = "rp_pending_login";

const sendSchema = z.object({
  phone: z.string().min(9).max(20),
  acceptTerms: z.literal("on", { error: "יש לאשר את תנאי השימוש ומדיניות הפרטיות" }),
  marketing: z.string().optional(),
  next: z.string().optional(),
});

function safeNext(next: string | undefined): string {
  if (!next || !next.startsWith("/") || next.startsWith("//")) return "/account";
  return next;
}

export async function sendOtpAction(_prev: ActionResult | null, formData: FormData): Promise<ActionResult<{ phone: string }>> {
  const parsed = sendSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) fieldErrors[String(issue.path[0])] = issue.message;
    return { ok: false, error: "יש לתקן את השדות המסומנים", fieldErrors };
  }
  const phone = parseIsraeliMobile(parsed.data.phone);
  if (!phone.ok) return { ok: false, error: phone.error, fieldErrors: { phone: phone.error } };

  const supabase = await createSupabaseServerClient();
  if (!supabase) return { ok: false, error: "שירות ההתחברות אינו מוגדר עדיין בסביבה הזו.", code: "not_configured" };

  const ip = await getClientIp();
  const okPhone = await rateLimit("otp_send", "phone:" + phone.e164, 5, 3600);
  const okIp = ip ? await rateLimit("otp_send", "ip:" + ip, 15, 3600) : true;
  if (!okPhone || !okIp) return { ok: false, error: "נשלחו יותר מדי קודי אימות. נסו שוב בעוד כשעה.", code: "rate_limited" };

  const captchaToken = formData.get("captchaToken");
  const { error } = await supabase.auth.signInWithOtp({
    phone: phone.e164,
    options: { channel: "sms", ...(typeof captchaToken === "string" && captchaToken ? { captchaToken } : {}) },
  });
  if (error) {
    console.error("[auth] signInWithOtp failed", error.code, error.message);
    const msg = /sms|provider|twilio|messagebird|vonage|unsupported/i.test(error.message)
      ? "שליחת SMS אינה זמינה כרגע. ספק ה-SMS טרם הוגדר."
      : /rate/i.test(error.message)
        ? "נשלחו יותר מדי בקשות. נסו שוב מאוחר יותר."
        : "לא הצלחנו לשלוח קוד אימות. נסו שוב.";
    return { ok: false, error: msg };
  }

  const cookieStore = await cookies();
  cookieStore.set(PENDING_COOKIE, JSON.stringify({ phone: phone.e164, marketing: parsed.data.marketing === "on", next: safeNext(parsed.data.next), at: Date.now() }), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 600,
    path: "/",
  });
  await track("otp_requested", {});
  redirect(`/verify${parsed.data.next ? `?next=${encodeURIComponent(safeNext(parsed.data.next))}` : ""}`);
}

export async function getPendingLogin(): Promise<{ phone: string; marketing: boolean; next: string } | null> {
  const cookieStore = await cookies();
  const raw = cookieStore.get(PENDING_COOKIE)?.value;
  if (!raw) return null;
  try {
    const data = JSON.parse(raw) as { phone: string; marketing: boolean; next: string; at: number };
    if (Date.now() - data.at > 10 * 60 * 1000) return null;
    return data;
  } catch {
    return null;
  }
}

const verifySchema = z.object({ code: z.string().min(6).max(6) });

export async function verifyOtpAction(_prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  const parsed = verifySchema.safeParse(Object.fromEntries(formData));
  const code = parsed.success ? parsed.data.code.trim() : "";
  if (!parsed.success || !isValidOtp(code)) return { ok: false, error: "קוד האימות מכיל 6 ספרות", fieldErrors: { code: "קוד האימות מכיל 6 ספרות" } };
  const pending = await getPendingLogin();
  if (!pending) return { ok: false, error: "פג תוקף הבקשה. יש לבקש קוד חדש.", code: "expired" };
  const supabase = await createSupabaseServerClient();
  if (!supabase) return { ok: false, error: "שירות ההתחברות אינו מוגדר.", code: "not_configured" };

  const ok = await rateLimit("otp_verify", "phone:" + pending.phone, 8, 900);
  if (!ok) return { ok: false, error: "יותר מדי ניסיונות. יש לבקש קוד חדש בעוד מספר דקות.", code: "rate_limited" };

  const { data, error } = await supabase.auth.verifyOtp({ phone: pending.phone, token: code, type: "sms" });
  if (error || !data.user) {
    const msg = /expired/i.test(error?.message ?? "") ? "הקוד פג תוקף. יש לבקש קוד חדש." : "הקוד שגוי. בדקו שוב את ההודעה שקיבלתם.";
    return { ok: false, error: msg, fieldErrors: { code: msg } };
  }

  // Versioned consents (terms + privacy are required; marketing is separate and opt-in)
  try {
    const ipHash = hashIp(await getClientIp());
    const ua = await getUserAgent();
    if (!(await hasCurrentConsent(supabase, data.user.id, "terms"))) await recordConsent(supabase, data.user.id, "terms", true, { ipHash, userAgent: ua });
    if (!(await hasCurrentConsent(supabase, data.user.id, "privacy"))) await recordConsent(supabase, data.user.id, "privacy", true, { ipHash, userAgent: ua });
    if (pending.marketing && !(await hasCurrentConsent(supabase, data.user.id, "marketing"))) {
      await recordConsent(supabase, data.user.id, "marketing", true, { ipHash, userAgent: ua });
      await supabase.from("profiles").update({ marketing_consent_at: new Date().toISOString() }).eq("id", data.user.id);
    }
  } catch (e) {
    console.error("[auth] consent recording failed", e);
  }

  const cookieStore = await cookies();
  cookieStore.delete(PENDING_COOKIE);
  await track("otp_verified", {}, data.user.id);
  redirect(pending.next || "/account");
}

export async function resendOtpAction(): Promise<ActionResult> {
  const pending = await getPendingLogin();
  if (!pending) return { ok: false, error: "פג תוקף הבקשה. יש להתחיל מחדש.", code: "expired" };
  const supabase = await createSupabaseServerClient();
  if (!supabase) return { ok: false, error: "שירות ההתחברות אינו מוגדר." };
  const ok = await rateLimit("otp_send", "phone:" + pending.phone, 5, 3600);
  if (!ok) return { ok: false, error: "נשלחו יותר מדי קודים. נסו שוב בעוד כשעה." };
  const { error } = await supabase.auth.signInWithOtp({ phone: pending.phone, options: { channel: "sms" } });
  if (error) return { ok: false, error: "לא הצלחנו לשלוח קוד חדש. נסו שוב." };
  return { ok: true, data: undefined, message: "קוד חדש נשלח" };
}

export async function signOutAction(): Promise<void> {
  const supabase = await createSupabaseServerClient();
  if (supabase) await supabase.auth.signOut();
  redirect("/");
}

export async function signOutEverywhereAction(): Promise<void> {
  const supabase = await createSupabaseServerClient();
  if (supabase) await supabase.auth.signOut({ scope: "global" });
  redirect("/login");
}
