import { describe, it, expect } from "vitest";
import { parseSearchParams, filtersToRpcPayload, filtersToQuery, countActiveFilters, describeFilters } from "@/features/listings/search-params";

const UUID = "11111111-1111-4111-8111-111111111111";

describe("marketplace filters", () => {
  it("parses combined filters from the URL", () => {
    const f = parseSearchParams({ make: `${UUID}`, price_max: "90000", year_min: "2021", year_max: "2024", km_max: "80000", sort: "price_asc", page: "2", fuel: "hybrid,electric" });
    expect(f.make).toEqual([UUID]);
    expect(f.price_max).toBe(90000);
    expect(f.fuel).toEqual(["hybrid", "electric"]);
    expect(f.sort).toBe("price_asc");
    expect(f.page).toBe(2);
  });

  it("falls back to defaults on invalid input instead of throwing", () => {
    const f = parseSearchParams({ sort: "drop table", page: "-4" });
    expect(f.sort).toBe("newest");
    expect(f.page).toBe(1);
  });

  it("maps filters to the RPC payload names", () => {
    const f = parseSearchParams({ make: UUID, district: UUID, price_min: "10000", radius_city: UUID, radius_km: "25", price_reduced: "1" });
    const p = filtersToRpcPayload(f, 24);
    expect(p).toMatchObject({ make_ids: [UUID], district_ids: [UUID], price_min: 10000, radius_city_id: UUID, radius_km: 25, price_reduced: true, page: 1, page_size: 24 });
  });

  it("omits radius unless both city and distance are present", () => {
    const p = filtersToRpcPayload(parseSearchParams({ radius_km: "25" }));
    expect(p.radius_km).toBeUndefined();
  });

  it("round-trips through the query string and omits defaults", () => {
    const f = parseSearchParams({ make: UUID, price_max: "90000", sort: "newest", page: "1" });
    const q = filtersToQuery(f);
    expect(q).toBe(`?make=${UUID}&price_max=90000`);
    expect(parseSearchParams(Object.fromEntries(new URLSearchParams(q.slice(1))))).toEqual(f);
  });

  it("counts active filters and supports clearing", () => {
    expect(countActiveFilters(parseSearchParams({}))).toBe(0);
    expect(countActiveFilters(parseSearchParams({ make: UUID, price_max: "1000" }))).toBe(2);
    expect(filtersToQuery(parseSearchParams({}))).toBe("");
  });

  it("describes a saved search in Hebrew", () => {
    const d = describeFilters(parseSearchParams({ make: UUID, year_min: "2021", year_max: "2024", price_max: "90000", km_max: "80000" }), { makes: { [UUID]: "יונדאי" } });
    expect(d).toContain("יונדאי");
    expect(d).toContain("2021");
    expect(d).toContain("2024");
    expect(d).toContain("90,000");
    expect(d).toContain("80,000");
  });
});
