import { describe, it, expect, vi, beforeEach } from "vitest";

const state = { rows: [] as { price: number; year: number; mileage_km: number | null }[], config: { min_comparables: 5, window_days: 120 }, enabled: true };

vi.mock("@/lib/supabase/server", () => {
  const client = {
    from: () => ({ select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: { config: state.config, enabled: state.enabled } }) }) }) }),
    rpc: async () => ({ data: state.rows.map((r, i) => ({ id: String(i), status: "active", published_at: null, ...r })), error: null }),
  };
  return { createSupabaseServerClient: async () => client, createSupabaseAdminClient: () => null };
});

import { runValuation } from "@/features/valuation/engine";

const UUID = "11111111-1111-4111-8111-111111111111";
const prices = (...p: number[]) => p.map((price) => ({ price, year: 2020, mileage_km: 60000 }));

describe("valuation engine", () => {
  beforeEach(() => { state.rows = []; state.config = { min_comparables: 5, window_days: 120 }; state.enabled = true; delete process.env.VALUATION_PROVIDER; });

  it("refuses to estimate with insufficient comparable listings", async () => {
    state.rows = prices(80000, 82000, 90000);
    const r = await runValuation({ model_id: UUID, year: 2020 });
    const internal = r.sources.find((s) => s.key === "internal_listings")!;
    expect(internal.status).toBe("insufficient_data");
    expect(internal.low).toBeUndefined();
    expect(internal.confidence).toBe("none");
    expect(internal.comparableCount).toBe(3);
  });

  it("computes an interquartile range and labels it as asking prices, not transactions", async () => {
    state.rows = prices(70000, 75000, 80000, 85000, 90000, 95000, 100000);
    const r = await runValuation({ model_id: UUID, year: 2020, mileage_km: 60000 });
    const s = r.sources.find((x) => x.key === "internal_listings")!;
    expect(s.status).toBe("ok");
    expect(s.label).toBe("מחירי פרסום של מודעות דומות");
    expect(s.disclaimer).toMatch(/לא במחירי עסקאות/);
    expect(s.low!).toBeLessThan(s.mid!);
    expect(s.mid!).toBeLessThan(s.high!);
    expect(s.mid).toBe(85000);
    expect(s.confidence).toBe("low");
  });

  it("raises confidence with more comparables", async () => {
    state.rows = prices(...Array.from({ length: 25 }, (_, i) => 70000 + i * 1000));
    const s = (await runValuation({ model_id: UUID, year: 2020 })).sources.find((x) => x.key === "internal_listings")!;
    expect(s.confidence).toBe("high");
  });

  it("positions an asking price relative to the range", async () => {
    state.rows = prices(70000, 75000, 80000, 85000, 90000, 95000, 100000);
    expect((await runValuation({ model_id: UUID, year: 2020, asking_price: 60000 })).askingPriceContext?.position).toBe("below");
    expect((await runValuation({ model_id: UUID, year: 2020, asking_price: 85000 })).askingPriceContext?.position).toBe("within");
    expect((await runValuation({ model_id: UUID, year: 2020, asking_price: 130000 })).askingPriceContext?.position).toBe("above");
  });

  it("reports the commercial provider as not configured and never returns a price from it", async () => {
    const r = await runValuation({ model_id: UUID, year: 2020 });
    const c = r.sources.find((x) => x.key === "commercial_provider")!;
    expect(c.status).toBe("not_configured");
    expect(c.low ?? c.mid ?? c.high).toBeUndefined();
  });

  it("respects a disabled internal source", async () => {
    state.enabled = false;
    state.rows = prices(70000, 75000, 80000, 85000, 90000, 95000);
    expect((await runValuation({ model_id: UUID, year: 2020 })).sources[0]!.status).toBe("not_configured");
  });
});
