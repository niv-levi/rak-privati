import { describe, it, expect } from "vitest";
import { withTx, makeSeller, makeDraftListing, submit, approve, dbEnabled } from "./db";

const d = dbEnabled ? describe : describe.skip;

d("permissions and RLS", () => {
  it("public cannot see pending listings or their images; active ones are visible", async () => {
    await withTx(async (tx) => {
      const { uid, declarationId } = await makeSeller(tx, "+972501000001");
      const mod = await tx.createUser("+972501000099");
      await tx.grantRole(mod, "moderator");
      const id = await makeDraftListing(tx, uid, declarationId);
      await submit(tx, uid, id);
      await tx.asAnon();
      let r = await tx.sql("select id from public.listings where id = $1", [id]);
      expect(r.rowCount).toBe(0);
      r = await tx.sql("select id from public.listing_images where listing_id = $1", [id]);
      expect(r.rowCount).toBe(0);
      r = await tx.sql("select id from public.public_listings where id = $1", [id]);
      expect(r.rowCount).toBe(0);
      await approve(tx, mod, id);
      await tx.asAnon();
      r = await tx.sql("select id, plate_masked from public.listings where id = $1", [id]);
      expect(r.rowCount).toBe(1);
      r = await tx.sql("select id from public.listing_images where listing_id = $1", [id]);
      expect(r.rowCount).toBe(3);
    });
  });

  it("full plate numbers are never readable by the public or other users", async () => {
    await withTx(async (tx) => {
      const { uid, declarationId } = await makeSeller(tx, "+972501000002");
      const other = await tx.createUser("+972501000003");
      const mod = await tx.createUser("+972501000098");
      await tx.grantRole(mod, "moderator");
      const id = await makeDraftListing(tx, uid, declarationId);
      await submit(tx, uid, id);
      await approve(tx, mod, id);
      await tx.asAnon();
      expect((await tx.sql("select * from public.listing_private_data where listing_id = $1", [id])).rowCount).toBe(0);
      await tx.asUser(other);
      expect((await tx.sql("select * from public.listing_private_data where listing_id = $1", [id])).rowCount).toBe(0);
      await tx.asUser(uid);
      expect((await tx.sql("select * from public.listing_private_data where listing_id = $1", [id])).rowCount).toBe(1);
    });
  });

  it("a seller cannot update another seller's listing", async () => {
    await withTx(async (tx) => {
      const s1 = await makeSeller(tx, "+972501000004");
      const s2 = await makeSeller(tx, "+972501000005");
      const id = await makeDraftListing(tx, s1.uid, s1.declarationId);
      await tx.asUser(s2.uid);
      const r = await tx.sql("update public.listings set price = 1000 where id = $1", [id]);
      expect(r.rowCount).toBe(0);
    });
  });

  it("a seller cannot approve their own listing", async () => {
    await withTx(async (tx) => {
      const { uid, declarationId } = await makeSeller(tx, "+972501000006");
      const id = await makeDraftListing(tx, uid, declarationId);
      await submit(tx, uid, id);
      await tx.asUser(uid);
      await expect(tx.sql("update public.listings set status = 'active' where id = $1", [id])).rejects.toThrow(/LISTING_TRANSITION_FORBIDDEN/);
    });
  });

  it("a seller cannot insert a listing as draft for someone else or as active", async () => {
    await withTx(async (tx) => {
      const s1 = await makeSeller(tx, "+972501000007");
      const s2 = await makeSeller(tx, "+972501000008");
      await tx.asUser(s1.uid);
      await expect(tx.sql("insert into public.listings (seller_id, status) values ($1, 'draft')", [s2.uid])).rejects.toThrow();
      await expect(tx.sql("insert into public.listings (seller_id, status) values ($1, 'active')", [s1.uid])).rejects.toThrow(/LISTING_MUST_START_AS_DRAFT/);
    });
  });

  it("a user cannot grant themselves an admin role", async () => {
    await withTx(async (tx) => {
      const uid = await tx.createUser("+972501000009");
      await tx.asUser(uid);
      await expect(tx.sql("insert into public.user_roles (user_id, role) values ($1, 'super_admin')", [uid])).rejects.toThrow();
      await tx.asSuper();
      expect((await tx.sql("select 1 from public.user_roles where user_id = $1", [uid])).rowCount).toBe(0);
    });
  });

  it("a super admin cannot grant a role to themselves, but can to others", async () => {
    await withTx(async (tx) => {
      const admin = await tx.createUser("+972501000010");
      const other = await tx.createUser("+972501000011");
      await tx.grantRole(admin, "super_admin");
      await tx.asUser(admin);
      await expect(tx.sql("insert into public.user_roles (user_id, role) values ($1, 'moderator')", [admin])).rejects.toThrow(/ROLE_SELF_GRANT_FORBIDDEN/);
      await tx.sql("insert into public.user_roles (user_id, role) values ($1, 'moderator')", [other]);
      const r = await tx.sql("select granted_by from public.user_roles where user_id = $1", [other]);
      expect(r.rows[0].granted_by).toBe(admin);
    });
  });

  it("phone numbers are not readable by other users; contact reveal is server-mediated", async () => {
    await withTx(async (tx) => {
      const { uid, declarationId } = await makeSeller(tx, "+972501000012");
      const buyer = await tx.createUser("+972501000013");
      const mod = await tx.createUser("+972501000097");
      await tx.grantRole(mod, "moderator");
      const id = await makeDraftListing(tx, uid, declarationId);
      await submit(tx, uid, id);
      await approve(tx, mod, id);
      await tx.asAnon();
      expect((await tx.sql("select phone_e164 from public.profiles where id = $1", [uid])).rowCount).toBe(0);
      await expect(tx.sql("select * from public.reveal_seller_contact($1, 'phone')", [id])).rejects.toThrow(/AUTH_REQUIRED|permission denied/);
      await tx.asUser(buyer);
      expect((await tx.sql("select phone_e164 from public.profiles where id = $1", [uid])).rowCount).toBe(0);
      const r = await tx.sql("select * from public.reveal_seller_contact($1, 'phone')", [id]);
      expect(r.rows[0].phone_e164).toBe("+972501000012");
      await expect(tx.sql("select * from public.reveal_seller_contact($1, 'whatsapp')", [id])).rejects.toThrow(/CHANNEL_NOT_AVAILABLE/);
      await tx.asSuper();
      const ev = await tx.sql("select count(*)::int as n from public.contact_events where listing_id = $1", [id]);
      expect(ev.rows[0].n).toBe(1);
      const n = await tx.sql("select type from public.notifications where user_id = $1", [uid]);
      expect(n.rows.map((x) => x.type)).toContain("new_inquiry");
    });
  });

  it("contact reveal is rate limited", async () => {
    await withTx(async (tx) => {
      const { uid, declarationId } = await makeSeller(tx, "+972501000014");
      const buyer = await tx.createUser("+972501000015");
      const mod = await tx.createUser("+972501000096");
      await tx.grantRole(mod, "moderator");
      const id = await makeDraftListing(tx, uid, declarationId);
      await submit(tx, uid, id);
      await approve(tx, mod, id);
      await tx.asSuper();
      await tx.sql("update public.application_settings set value = '2' where key = 'contact_reveal_limit_per_hour'");
      await tx.asUser(buyer);
      await tx.sql("select * from public.reveal_seller_contact($1, 'phone')", [id]);
      await tx.sql("select * from public.reveal_seller_contact($1, 'phone')", [id]);
      await expect(tx.sql("select * from public.reveal_seller_contact($1, 'phone')", [id])).rejects.toThrow(/RATE_LIMITED/);
    });
  });

  it("consent records and audit logs are immutable", async () => {
    await withTx(async (tx) => {
      const uid = await tx.createUser("+972501000016");
      await tx.asUser(uid);
      const c = await tx.sql("insert into public.consent_records (user_id, consent_type, version, granted) values ($1, 'terms', 'v1', true) returning id", [uid]);
      // RLS: no update/delete policy for users (0 rows affected) …
      expect((await tx.sql("update public.consent_records set granted = false where id = $1", [c.rows[0].id])).rowCount).toBe(0);
      // … and even a privileged connection is blocked by the immutability trigger.
      await tx.asSuper();
      await expect(tx.sql("update public.consent_records set granted = false where id = $1", [c.rows[0].id])).rejects.toThrow(/IMMUTABLE_ROW/);
      await expect(tx.sql("delete from public.consent_records where id = $1", [c.rows[0].id])).rejects.toThrow(/IMMUTABLE_ROW/);
      await tx.sql("select public.write_audit('test', 'thing', '1', null, '{\"a\":1}')");
      await tx.sql("select public.write_audit('test', 'thing', '2', null, '{\"a\":2}')");
      const logs = await tx.sql("select prev_hash, row_hash from public.audit_logs order by seq");
      expect(logs.rows[1].prev_hash).toBe(logs.rows[0].row_hash);
      await expect(tx.sql("delete from public.audit_logs")).rejects.toThrow(/IMMUTABLE_ROW/);
    });
  });

  it("users cannot insert image rows directly (server-only), and images are capped at 15 for everyone", async () => {
    await withTx(async (tx) => {
      const s1 = await makeSeller(tx, "+972501000017");
      const s2 = await makeSeller(tx, "+972501000018");
      const id = await makeDraftListing(tx, s1.uid, s1.declarationId);
      await tx.asUser(s2.uid);
      await expect(tx.sql("insert into public.listing_images (listing_id, storage_path) values ($1, 'listings/x/y.webp')", [id])).rejects.toThrow();
      await tx.asUser(s1.uid);
      await expect(tx.sql("insert into public.listing_images (listing_id, storage_path, content_hash) values ($1, $2, 'forged')", [id, `listings/${id}/forged.webp`])).rejects.toThrow();
      // owner may still reorder / set cover / alt text
      const upd = await tx.sql("update public.listing_images set alt_text = 'חזית', content_hash = 'tamper' where listing_id = $1 and sort_order = 0 returning alt_text, content_hash", [id]);
      expect(upd.rows[0].alt_text).toBe("חזית");
      expect(upd.rows[0].content_hash).not.toBe("tamper");
      await tx.asService();
      for (let i = 3; i < 15; i++) await tx.sql("insert into public.listing_images (listing_id, storage_path, status) values ($1, $2, 'ready')", [id, `listings/${id}/${i}.webp`]);
      await expect(tx.sql("insert into public.listing_images (listing_id, storage_path) values ($1, $2)", [id, `listings/${id}/16.webp`])).rejects.toThrow(/TOO_MANY_IMAGES/);
    });
  });

  it("plate hashes are computed by the database and cannot be spoofed by sellers", async () => {
    await withTx(async (tx) => {
      const { uid, declarationId } = await makeSeller(tx, "+972501000030");
      const id = await makeDraftListing(tx, uid, declarationId, { plate: "4455667" });
      await tx.asUser(uid);
      let r = await tx.sql("select plate_hash, plate_masked from public.listings where id = $1", [id]);
      expect(r.rows[0].plate_hash).toMatch(/^[0-9a-f]{64}$/);
      expect(r.rows[0].plate_masked).toBe("••-•••-67");
      const original = r.rows[0].plate_hash;
      await tx.sql("update public.listings set plate_hash = 'spoofed', plate_masked = 'x' where id = $1", [id]);
      r = await tx.sql("select plate_hash, plate_masked from public.listings where id = $1", [id]);
      expect(r.rows[0].plate_hash).toBe(original);
      // the salt and hash function are not reachable from user sessions
      await expect(tx.sql("select public.compute_plate_hash('4455667')")).rejects.toThrow(/permission denied/);
      await expect(tx.sql("select * from private.secrets")).rejects.toThrow(/permission denied/);
      // once submitted, the plate is locked
      await tx.sql("update public.listings set status = 'pending_review' where id = $1", [id]);
      await expect(tx.sql("update public.listing_private_data set plate_number = '1111111' where listing_id = $1", [id])).rejects.toThrow(/PLATE_LOCKED|row-level/);
    });
  });

  it("non-private ownership raises a review flag on submission", async () => {
    await withTx(async (tx) => {
      const { uid, declarationId } = await makeSeller(tx, "+972501000031");
      const id = await makeDraftListing(tx, uid, declarationId, { plate: "4455668" });
      await tx.asUser(uid);
      await tx.sql("update public.listings set ownership_type = 'leasing', status = 'pending_review' where id = $1", [id]);
      await tx.asSuper();
      const f = await tx.sql("select details->>'reason' as reason from public.moderation_flags where listing_id = $1", [id]);
      expect(f.rows.map((x) => x.reason)).toContain("non_private_ownership");
    });
  });

  it("storage: only the listing owner can upload into the listing folder", async () => {
    await withTx(async (tx) => {
      const s1 = await makeSeller(tx, "+972501000019");
      const s2 = await makeSeller(tx, "+972501000020");
      const id = await makeDraftListing(tx, s1.uid, s1.declarationId);
      await tx.asUser(s1.uid);
      await tx.sql("insert into storage.objects (bucket_id, name) values ('listing-images', $1)", [`listings/${id}/a.webp`]);
      await tx.asUser(s2.uid);
      await expect(tx.sql("insert into storage.objects (bucket_id, name) values ('listing-images', $1)", [`listings/${id}/b.webp`])).rejects.toThrow();
      await tx.asAnon();
      expect((await tx.sql("select 1 from storage.objects where name = $1", [`listings/${id}/a.webp`])).rowCount).toBe(0);
    });
  });

  it("self-service account deletion removes listings and personal data", async () => {
    await withTx(async (tx) => {
      const { uid, declarationId } = await makeSeller(tx, "+972501000021");
      const id = await makeDraftListing(tx, uid, declarationId);
      await tx.asUser(uid);
      await tx.sql("update public.profiles set display_name = 'רון' where id = $1", [uid]);
      await tx.sql("select public.request_account_deletion()");
      await tx.asSuper();
      const l = await tx.sql("select status from public.listings where id = $1", [id]);
      expect(l.rows[0].status).toBe("removed");
      const p = await tx.sql("select account_status, display_name from public.profiles where id = $1", [uid]);
      expect(p.rows[0].account_status).toBe("deleted");
      expect(p.rows[0].display_name).toBeNull();
    });
  });
});
