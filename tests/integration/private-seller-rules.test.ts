import { describe, it, expect } from "vitest";
import { withTx, makeSeller, makeDraftListing, submit, approve, dbEnabled } from "./db";

const d = dbEnabled ? describe : describe.skip;

d("private-seller rules (database)", () => {
  it("rejects submission without a private-seller declaration", async () => {
    await withTx(async (tx) => {
      const { uid, declarationId } = await makeSeller(tx, "+972500000001");
      const id = await makeDraftListing(tx, uid, declarationId);
      await tx.asUser(uid);
      await tx.sql("update public.listings set declaration_id = null where id = $1", [id]);
      await expect(tx.sql("update public.listings set status = 'pending_review' where id = $1", [id])).rejects.toThrow(/DECLARATION_REQUIRED/);
    });
  });

  it("enforces the default maximum of two active/pending listings", async () => {
    await withTx(async (tx) => {
      const { uid, declarationId } = await makeSeller(tx, "+972500000002");
      const a = await makeDraftListing(tx, uid, declarationId, { plate: "1111111" });
      const b = await makeDraftListing(tx, uid, declarationId, { plate: "2222222" });
      const c = await makeDraftListing(tx, uid, declarationId, { plate: "3333333" });
      await submit(tx, uid, a);
      await submit(tx, uid, b);
      await expect(submit(tx, uid, c)).rejects.toThrow(/LISTING_LIMIT_EXCEEDED/);
    });
  });

  it("lets an admin raise the per-account limit", async () => {
    await withTx(async (tx) => {
      const { uid, declarationId } = await makeSeller(tx, "+972500000003");
      const mod = await tx.createUser("+972500000099");
      await tx.grantRole(mod, "super_admin");
      await tx.asUser(mod);
      await tx.sql("update public.profiles set max_active_listings = 3 where id = $1", [uid]);
      const ids = [];
      for (const p of ["4444444", "5555555", "6666666"]) ids.push(await makeDraftListing(tx, uid, declarationId, { plate: p }));
      for (const id of ids) await submit(tx, uid, id);
      await tx.asUser(uid);
      const { rows } = await tx.sql("select count(*)::int as n from public.listings where seller_id = $1 and status = 'pending_review'", [uid]);
      expect(rows[0].n).toBe(3);
    });
  });

  it("a user cannot raise their own listing limit", async () => {
    await withTx(async (tx) => {
      const { uid } = await makeSeller(tx, "+972500000004");
      await tx.asUser(uid);
      await tx.sql("update public.profiles set max_active_listings = 10, display_name = 'דני' where id = $1", [uid]);
      const { rows } = await tx.sql("select max_active_listings, display_name from public.profiles where id = $1", [uid]);
      expect(rows[0].max_active_listings).toBeNull();
      expect(rows[0].display_name).toBe("דני");
    });
  });

  it("flags a plate advertised by a different account", async () => {
    await withTx(async (tx) => {
      const s1 = await makeSeller(tx, "+972500000005");
      const s2 = await makeSeller(tx, "+972500000006");
      const a = await makeDraftListing(tx, s1.uid, s1.declarationId, { plate: "7777777" });
      await submit(tx, s1.uid, a);
      const b = await makeDraftListing(tx, s2.uid, s2.declarationId, { plate: "7777777", imageHashPrefix: "other_" });
      await submit(tx, s2.uid, b);
      await tx.asSuper();
      const { rows } = await tx.sql("select flag_type from public.moderation_flags where listing_id = $1", [b]);
      expect(rows.map((r) => r.flag_type)).toContain("duplicate_plate");
    });
  });

  it("flags duplicate images across accounts", async () => {
    await withTx(async (tx) => {
      const s1 = await makeSeller(tx, "+972500000007");
      const s2 = await makeSeller(tx, "+972500000008");
      await makeDraftListing(tx, s1.uid, s1.declarationId, { plate: "8888888", imageHashPrefix: "same_" });
      const b = await makeDraftListing(tx, s2.uid, s2.declarationId, { plate: "9999999", imageHashPrefix: "same_" });
      await tx.asService();
      await tx.sql("insert into public.listing_images (listing_id, storage_path, sort_order, status, content_hash) values ($1, $2, 9, 'ready', 'same_8888888_0')", [b, `listings/${b}/dup.webp`]);
      await tx.asSuper();
      const { rows } = await tx.sql("select flag_type from public.moderation_flags where listing_id = $1", [b]);
      expect(rows.map((r) => r.flag_type)).toContain("duplicate_image");
    });
  });

  it("flags similar descriptions from different sellers", async () => {
    await withTx(async (tx) => {
      const text = "רכב במצב מצוין שמור בקפידה טיפולים במוסך מורשה בלבד יד ראשונה מהחברה ללא תאונות מחיר סופי ללא מיקוח המחיר כולל העברת בעלות";
      const s1 = await makeSeller(tx, "+972500000009");
      const s2 = await makeSeller(tx, "+972500000010");
      const a = await makeDraftListing(tx, s1.uid, s1.declarationId, { plate: "1212121", description: text });
      await submit(tx, s1.uid, a);
      const b = await makeDraftListing(tx, s2.uid, s2.declarationId, { plate: "3434343", description: text + " פנו עכשיו", imageHashPrefix: "x_" });
      await submit(tx, s2.uid, b);
      await tx.asSuper();
      const { rows } = await tx.sql("select flag_type from public.moderation_flags where listing_id = $1", [b]);
      expect(rows.map((r) => r.flag_type)).toContain("similar_description");
    });
  });

  it("flags related accounts that share a device signal and publish", async () => {
    await withTx(async (tx) => {
      const s1 = await makeSeller(tx, "+972500000011");
      const s2 = await makeSeller(tx, "+972500000012");
      await tx.asSuper();
      await tx.sql("insert into public.account_signals (user_id, signal_type, value_hash) values ($1, 'device', 'dev1'), ($2, 'device', 'dev1')", [s1.uid, s2.uid]);
      const a = await makeDraftListing(tx, s1.uid, s1.declarationId, { plate: "5656565" });
      await submit(tx, s1.uid, a);
      const b = await makeDraftListing(tx, s2.uid, s2.declarationId, { plate: "7878787", imageHashPrefix: "y_" });
      await submit(tx, s2.uid, b);
      await tx.asSuper();
      const { rows } = await tx.sql("select flag_type from public.moderation_flags where listing_id = $1", [b]);
      expect(rows.map((r) => r.flag_type)).toContain("related_accounts");
    });
  });

  it("never auto-labels: flags are advisory and listings stay pending for a human", async () => {
    await withTx(async (tx) => {
      const s1 = await makeSeller(tx, "+972500000013");
      const s2 = await makeSeller(tx, "+972500000014");
      const a = await makeDraftListing(tx, s1.uid, s1.declarationId, { plate: "9090909" });
      await submit(tx, s1.uid, a);
      const b = await makeDraftListing(tx, s2.uid, s2.declarationId, { plate: "9090909", imageHashPrefix: "z_" });
      await submit(tx, s2.uid, b);
      await tx.asSuper();
      const { rows } = await tx.sql("select status from public.listings where id = $1", [b]);
      expect(rows[0].status).toBe("pending_review");
      const p = await tx.sql("select account_status, review_level from public.profiles where id = $1", [s2.uid]);
      expect(p.rows[0].account_status).toBe("active");
    });
  });

  it("revoking a declaration pauses the seller's public listing", async () => {
    await withTx(async (tx) => {
      const { uid, declarationId } = await makeSeller(tx, "+972500000015");
      const mod = await tx.createUser("+972500000098");
      await tx.grantRole(mod, "moderator");
      const id = await makeDraftListing(tx, uid, declarationId);
      await submit(tx, uid, id);
      await approve(tx, mod, id);
      await tx.asUser(uid);
      await tx.sql("update public.seller_declarations set revoked_at = now(), revoked_reason = 'user' where id = $1", [declarationId]);
      await tx.asSuper();
      const { rows } = await tx.sql("select status from public.listings where id = $1", [id]);
      expect(rows[0].status).toBe("paused");
    });
  });

  it("supports appeals: user files, moderator decides, history is immutable", async () => {
    await withTx(async (tx) => {
      const { uid, declarationId } = await makeSeller(tx, "+972500000016");
      const mod = await tx.createUser("+972500000097");
      await tx.grantRole(mod, "moderator");
      const id = await makeDraftListing(tx, uid, declarationId);
      await submit(tx, uid, id);
      await tx.asUser(mod);
      await tx.sql("update public.listings set status = 'rejected', rejection_reason = 'חשד לפרסום מסחרי' where id = $1", [id]);
      const act = await tx.sql("insert into public.moderation_actions (listing_id, target_user_id, actor_id, action, reason) values ($1, $2, $3, 'reject', 'חשד לפרסום מסחרי') returning id", [id, uid, mod]);
      await tx.asUser(uid);
      const ap = await tx.sql("insert into public.appeals (user_id, listing_id, moderation_action_id, message) values ($1, $2, $3, 'אני מוכר פרטי, זה הרכב היחיד שלי. מצורפים מסמכים.') returning id", [uid, id, act.rows[0].id]);
      expect((await tx.sql("update public.moderation_actions set reason = 'x' where id = $1", [act.rows[0].id])).rowCount).toBe(0);
      await tx.asSuper();
      await expect(tx.sql("update public.moderation_actions set reason = 'x' where id = $1", [act.rows[0].id])).rejects.toThrow(/IMMUTABLE_ROW/);
      await tx.sql("update public.appeals set status = 'accepted', decided_by = $2, decided_at = now() where id = $1", [ap.rows[0].id, mod]);
      await tx.asUser(uid);
      const { rows } = await tx.sql("select status from public.appeals where id = $1", [ap.rows[0].id]);
      expect(rows[0].status).toBe("accepted");
    });
  });
});
