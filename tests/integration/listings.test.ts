import { describe, it, expect } from "vitest";
import { withTx, makeSeller, makeDraftListing, submit, approve, dbEnabled } from "./db";

const d = dbEnabled ? describe : describe.skip;

d("listing lifecycle, search and valuation comparables", () => {
  it("runs the full lifecycle: draft → pending → active → paused → active → sold", async () => {
    await withTx(async (tx) => {
      const { uid, declarationId } = await makeSeller(tx, "+972502000001");
      const mod = await tx.createUser("+972502000099");
      await tx.grantRole(mod, "moderator");
      const id = await makeDraftListing(tx, uid, declarationId);
      await submit(tx, uid, id);
      await approve(tx, mod, id);
      await tx.asUser(uid);
      let r = await tx.sql("select status, published_at, expires_at from public.listings where id = $1", [id]);
      expect(r.rows[0].status).toBe("active");
      expect(r.rows[0].published_at).not.toBeNull();
      expect(r.rows[0].expires_at).not.toBeNull();
      await tx.sql("update public.listings set status = 'paused' where id = $1", [id]);
      await tx.sql("update public.listings set status = 'active' where id = $1", [id]);
      await tx.sql("update public.listings set status = 'sold' where id = $1", [id]);
      r = await tx.sql("select status, sold_at from public.listings where id = $1", [id]);
      expect(r.rows[0].status).toBe("sold");
      expect(r.rows[0].sold_at).not.toBeNull();
      await tx.asSuper();
      const n = await tx.sql("select type from public.notifications where user_id = $1", [uid]);
      expect(n.rows.map((x) => x.type)).toContain("listing_approved");
    });
  });

  it("rejection and correction requests notify the seller", async () => {
    await withTx(async (tx) => {
      const { uid, declarationId } = await makeSeller(tx, "+972502000002");
      const mod = await tx.createUser("+972502000098");
      await tx.grantRole(mod, "moderator");
      const a = await makeDraftListing(tx, uid, declarationId, { plate: "1010101" });
      const b = await makeDraftListing(tx, uid, declarationId, { plate: "2020202" });
      await submit(tx, uid, a);
      await submit(tx, uid, b);
      await tx.asUser(mod);
      await tx.sql("update public.listings set status = 'rejected', rejection_reason = 'תמונות לא ברורות' where id = $1", [a]);
      await tx.sql("update public.listings set status = 'needs_correction', correction_notes = 'נא להוסיף קילומטראז׳' where id = $1", [b]);
      await tx.asUser(uid);
      // seller fixes and resubmits b
      await tx.sql("update public.listings set mileage_km = 70000, status = 'pending_review' where id = $1", [b]);
      await tx.asSuper();
      const n = await tx.sql("select type from public.notifications where user_id = $1 order by created_at", [uid]);
      expect(n.rows.map((x) => x.type)).toEqual(expect.arrayContaining(["listing_rejected", "listing_needs_correction"]));
      const s = await tx.sql("select status from public.listings where id = $1", [b]);
      expect(s.rows[0].status).toBe("pending_review");
    });
  });

  it("a listing paused by a moderator cannot be reactivated by the seller", async () => {
    await withTx(async (tx) => {
      const { uid, declarationId } = await makeSeller(tx, "+972502000003");
      const mod = await tx.createUser("+972502000097");
      await tx.grantRole(mod, "moderator");
      const id = await makeDraftListing(tx, uid, declarationId);
      await submit(tx, uid, id);
      await approve(tx, mod, id);
      await tx.asUser(mod);
      await tx.sql("update public.listings set status = 'paused' where id = $1", [id]);
      await tx.sql("insert into public.moderation_actions (listing_id, target_user_id, actor_id, action, reason) values ($1, $2, $3, 'pause', 'בדיקה')", [id, uid, mod]);
      await tx.asUser(uid);
      await expect(tx.sql("update public.listings set status = 'active' where id = $1", [id])).rejects.toThrow(/LISTING_TRANSITION_FORBIDDEN/);
    });
  });

  it("expires listings via expire_listings()", async () => {
    await withTx(async (tx) => {
      const { uid, declarationId } = await makeSeller(tx, "+972502000004");
      const mod = await tx.createUser("+972502000096");
      await tx.grantRole(mod, "moderator");
      const id = await makeDraftListing(tx, uid, declarationId);
      await submit(tx, uid, id);
      await approve(tx, mod, id);
      await tx.asService();
      await tx.sql("update public.listings set expires_at = now() - interval '1 day' where id = $1", [id]);
      const r = await tx.sql("select public.expire_listings() as n");
      expect(r.rows[0].n).toBe(1);
      await tx.asAnon();
      expect((await tx.sql("select 1 from public.listings where id = $1", [id])).rowCount).toBe(0);
    });
  });

  it("records price history and notifies users who saved the listing on a price drop", async () => {
    await withTx(async (tx) => {
      const { uid, declarationId } = await makeSeller(tx, "+972502000005");
      const buyer = await tx.createUser("+972502000006");
      const mod = await tx.createUser("+972502000095");
      await tx.grantRole(mod, "moderator");
      const id = await makeDraftListing(tx, uid, declarationId, { price: 90000 });
      await submit(tx, uid, id);
      await approve(tx, mod, id);
      await tx.asUser(buyer);
      await tx.sql("insert into public.favorites (user_id, listing_id) values ($1, $2)", [buyer, id]);
      await tx.asUser(uid);
      await tx.sql("update public.listings set price = 80000 where id = $1", [id]);
      await tx.asAnon();
      const h = await tx.sql("select old_price, new_price from public.listing_price_history where listing_id = $1", [id]);
      expect(h.rows[0]).toMatchObject({ old_price: 90000, new_price: 80000 });
      await tx.asUser(buyer);
      const n = await tx.sql("select type from public.notifications where user_id = $1", [buyer]);
      expect(n.rows.map((x) => x.type)).toContain("price_reduced");
    });
  });

  it("notifies matching saved searches when a listing goes live", async () => {
    await withTx(async (tx) => {
      const { uid, declarationId } = await makeSeller(tx, "+972502000007");
      const buyer = await tx.createUser("+972502000008");
      const mod = await tx.createUser("+972502000094");
      await tx.grantRole(mod, "moderator");
      await tx.asSuper();
      const make = await tx.sql("select id from public.vehicle_makes where slug = 'toyota'");
      await tx.asUser(buyer);
      await tx.sql("insert into public.saved_searches (user_id, name, query) values ($1, 'טויוטה עד 90 אלף', $2)", [buyer, JSON.stringify({ make_ids: [make.rows[0].id], price_max: 90000 })]);
      await tx.sql("insert into public.saved_searches (user_id, name, query) values ($1, 'יקר', $2)", [buyer, JSON.stringify({ price_min: 200000 })]);
      const id = await makeDraftListing(tx, uid, declarationId, { price: 85000 });
      await submit(tx, uid, id);
      await approve(tx, mod, id);
      await tx.asUser(buyer);
      const n = await tx.sql("select body from public.notifications where user_id = $1 and type = 'saved_search_match'", [buyer]);
      expect(n.rowCount).toBe(1);
      expect(n.rows[0].body).toContain("טויוטה עד 90 אלף");
    });
  });

  it("search_listings applies combined filters, sorting and pagination", async () => {
    await withTx(async (tx) => {
      const { uid, declarationId } = await makeSeller(tx, "+972502000009");
      const mod = await tx.createUser("+972502000093");
      await tx.grantRole(mod, "moderator");
      await tx.asUser(mod);
      await tx.sql("update public.profiles set max_active_listings = 10 where id = $1", [uid]);
      const specs = [
        { plate: "1000001", year: 2018, price: 50000, mileage_km: 120000 },
        { plate: "1000002", year: 2021, price: 95000, mileage_km: 40000 },
        { plate: "1000003", year: 2022, price: 110000, mileage_km: 20000 },
        { plate: "1000004", year: 2020, price: 70000, mileage_km: 80000 },
      ];
      const ids: string[] = [];
      for (const s of specs) {
        const id = await makeDraftListing(tx, uid, declarationId, s);
        await submit(tx, uid, id);
        await approve(tx, mod, id);
        ids.push(id);
      }
      await tx.asSuper();
      const make = await tx.sql("select id from public.vehicle_makes where slug = 'toyota'");
      const district = await tx.sql("select district_id from public.geo_cities where name_he = 'חיפה'");
      await tx.asAnon();
      let r = await tx.sql("select id, price, total_count from public.search_listings($1)", [JSON.stringify({ make_ids: [make.rows[0].id], year_min: 2020, price_max: 100000, sort: "price_asc" })]);
      expect(r.rows.map((x) => x.price)).toEqual([70000, 95000]);
      expect(Number(r.rows[0].total_count)).toBe(2);
      r = await tx.sql("select id, mileage_km, total_count from public.search_listings($1)", [JSON.stringify({ district_ids: [district.rows[0].district_id], sort: "km_asc", page: 1, page_size: 2 })]);
      expect(r.rows.map((x) => x.mileage_km)).toEqual([20000, 40000]);
      expect(Number(r.rows[0].total_count)).toBe(4);
      r = await tx.sql("select id, mileage_km from public.search_listings($1)", [JSON.stringify({ sort: "km_asc", page: 2, page_size: 2 })]);
      expect(r.rows.map((x) => x.mileage_km)).toEqual([80000, 120000]);
      // radius search: Haifa listings within 30km of Haifa, none within 30km of Eilat
      const haifa = await tx.sql("select id from public.geo_cities where name_he = 'חיפה'");
      const eilat = await tx.sql("select id from public.geo_cities where name_he = 'אילת'");
      r = await tx.sql("select id from public.search_listings($1)", [JSON.stringify({ radius_city_id: haifa.rows[0].id, radius_km: 30 })]);
      expect(r.rowCount).toBe(4);
      r = await tx.sql("select id from public.search_listings($1)", [JSON.stringify({ radius_city_id: eilat.rows[0].id, radius_km: 30 })]);
      expect(r.rowCount).toBe(0);
      // seller contact and plate never appear in search output
      const cols = Object.keys(r.fields.reduce((a, f) => ({ ...a, [f.name]: 1 }), {}));
      expect(cols).not.toContain("plate_number");
    });
  });

  it("comparable_listings returns only same-model recent listings", async () => {
    await withTx(async (tx) => {
      const { uid, declarationId } = await makeSeller(tx, "+972502000010");
      const mod = await tx.createUser("+972502000092");
      await tx.grantRole(mod, "moderator");
      const id = await makeDraftListing(tx, uid, declarationId, { year: 2020, price: 80000 });
      await submit(tx, uid, id);
      await approve(tx, mod, id);
      await tx.asSuper();
      const model = await tx.sql("select id from public.vehicle_models where slug = 'corolla'");
      const other = await tx.sql("select id from public.vehicle_models where slug = 'yaris'");
      await tx.asAnon();
      let r = await tx.sql("select * from public.comparable_listings($1, 2020, 60000, 120, null)", [model.rows[0].id]);
      expect(r.rowCount).toBe(1);
      r = await tx.sql("select * from public.comparable_listings($1, 2020, 60000, 120, null)", [other.rows[0].id]);
      expect(r.rowCount).toBe(0);
      r = await tx.sql("select * from public.comparable_listings($1, 2020, 60000, 120, $2)", [model.rows[0].id, id]);
      expect(r.rowCount).toBe(0);
    });
  });
});
