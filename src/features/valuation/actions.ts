"use server";
import { z } from "zod";
import { runValuation, type ValuationResult } from "./engine";
import { getCurrentUser } from "@/lib/supabase/server";
import { rateLimit } from "@/lib/security/rate-limit";
import { getClientIp } from "@/lib/security/request";
import { track } from "@/lib/analytics/track";

const schema = z.object({
  make_id: z.string().uuid(),
  model_id: z.string().uuid(),
  year: z.coerce.number().int().min(1980).max(new Date().getFullYear() + 1),
  mileage_km: z.coerce.number().int().min(0).max(2_000_000).optional(),
  ownership_count: z.coerce.number().int().min(1).max(20).optional(),
  ownership_type: z.enum(["private", "leasing", "rental", "company", "other"]).optional(),
  condition: z.enum(["excellent", "very_good", "good", "fair", "needs_repair"]).optional(),
  known_damage: z.boolean().optional(),
  asking_price: z.coerce.number().int().min(1000).max(5_000_000).optional(),
});

export type ValuationActionResult = { ok: true; result: ValuationResult } | { ok: false; error: string };

export async function valuationAction(input: unknown): Promise<ValuationActionResult> {
  const parsed = schema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "יש לבחור יצרן, דגם ושנה תקינים" };
  const user = await getCurrentUser();
  const key = user?.id ?? (await getClientIp()) ?? "anon";
  if (!(await rateLimit("valuation", key, 30, 3600))) return { ok: false, error: "יותר מדי בקשות. נסו שוב מאוחר יותר." };
  const result = await runValuation({ ...parsed.data, mileage_km: parsed.data.mileage_km ?? null }, { persist: { userId: user?.id ?? null } });
  await track("valuation_requested", { has_result: result.sources.some((s) => s.status === "ok") }, user?.id);
  return { ok: true, result };
}
