import { describe, it, expect, vi, beforeEach } from "vitest";

const cookieJar = new Map<string, string>();
const calls = { signIn: [] as unknown[], verify: [] as unknown[] };
let verifyResult: { data: { user: { id: string } | null }; error: { message: string } | null } = { data: { user: { id: "u1" } }, error: null };

vi.mock("next/headers", () => ({
  cookies: async () => ({ get: (k: string) => (cookieJar.has(k) ? { value: cookieJar.get(k) } : undefined), set: (k: string, v: string) => cookieJar.set(k, v), delete: (k: string) => cookieJar.delete(k), getAll: () => [] }),
  headers: async () => new Map([["x-forwarded-for", "10.0.0.1"]]),
}));
vi.mock("next/navigation", () => ({ redirect: (url: string) => { throw Object.assign(new Error("NEXT_REDIRECT"), { url }); } }));
vi.mock("@/lib/analytics/track", () => ({ track: async () => undefined }));
vi.mock("@/features/consents/service", () => ({ recordConsent: async () => ({ id: "c", version: "v" }), hasCurrentConsent: async () => false }));
vi.mock("@/lib/supabase/server", () => ({
  createSupabaseAdminClient: () => null, // forces in-memory rate limiter
  createSupabaseServerClient: async () => ({
    auth: {
      signInWithOtp: async (args: unknown) => { calls.signIn.push(args); return { error: null }; },
      verifyOtp: async (args: unknown) => { calls.verify.push(args); return verifyResult; },
      signOut: async () => ({ error: null }),
    },
    from: () => ({ update: () => ({ eq: async () => ({}) }) }),
  }),
}));

import { sendOtpAction, verifyOtpAction } from "@/features/auth/actions";

const fd = (o: Record<string, string>) => { const f = new FormData(); for (const [k, v] of Object.entries(o)) f.set(k, v); return f; };
async function expectRedirect(p: Promise<unknown>) { try { await p; } catch (e) { return (e as { url?: string }).url; } throw new Error("expected redirect"); }

describe("phone OTP flow", () => {
  beforeEach(() => { cookieJar.clear(); calls.signIn = []; calls.verify = []; verifyResult = { data: { user: { id: "u1" } }, error: null }; });

  it("requires accepting the terms and privacy policy", async () => {
    const r = await sendOtpAction(null, fd({ phone: "0501234567" }));
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.fieldErrors?.acceptTerms).toBeTruthy();
    expect(calls.signIn).toHaveLength(0);
  });

  it("rejects non-mobile numbers before calling the provider", async () => {
    const r = await sendOtpAction(null, fd({ phone: "03-1234567", acceptTerms: "on" }));
    expect(r.ok).toBe(false);
    expect(calls.signIn).toHaveLength(0);
  });

  it("sends an SMS OTP to the normalized E.164 number and redirects to /verify", async () => {
    const url = await expectRedirect(sendOtpAction(null, fd({ phone: "050-765-4321", acceptTerms: "on", next: "/sell" })));
    expect(url).toBe("/verify?next=%2Fsell");
    expect(calls.signIn[0]).toMatchObject({ phone: "+972507654321", options: { channel: "sms" } });
    expect(JSON.parse(cookieJar.get("rp_pending_login")!).phone).toBe("+972507654321");
  });

  it("ignores open-redirect targets", async () => {
    await expectRedirect(sendOtpAction(null, fd({ phone: "0507654322", acceptTerms: "on", next: "//evil.example" })));
    expect(JSON.parse(cookieJar.get("rp_pending_login")!).next).toBe("/account");
  });

  it("rate limits OTP requests per phone number", async () => {
    let limited = false;
    for (let i = 0; i < 7; i++) {
      try {
        const r = await sendOtpAction(null, fd({ phone: "0501112222", acceptTerms: "on" }));
        if (!r.ok && r.code === "rate_limited") limited = true;
      } catch { /* redirect on success */ }
    }
    expect(limited).toBe(true);
    expect(calls.signIn.length).toBe(5);
  });

  it("verifies a 6-digit code and redirects to the requested page", async () => {
    await expectRedirect(sendOtpAction(null, fd({ phone: "0523334444", acceptTerms: "on", next: "/account/listings" })));
    const url = await expectRedirect(verifyOtpAction(null, fd({ code: "123456" })));
    expect(url).toBe("/account/listings");
    expect(calls.verify[0]).toMatchObject({ phone: "+972523334444", token: "123456", type: "sms" });
    expect(cookieJar.has("rp_pending_login")).toBe(false);
  });

  it("returns a Hebrew error for a wrong or expired code", async () => {
    await expectRedirect(sendOtpAction(null, fd({ phone: "0523334445", acceptTerms: "on" })));
    verifyResult = { data: { user: null }, error: { message: "Token has expired or is invalid" } };
    const r = await verifyOtpAction(null, fd({ code: "000000" }));
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toMatch(/פג תוקף|שגוי/);
  });

  it("rejects verification without a pending request", async () => {
    const r = await verifyOtpAction(null, fd({ code: "123456" }));
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.code).toBe("expired");
  });
});
