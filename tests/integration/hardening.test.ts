import { describe, it, expect } from "vitest";
import { withTx, makeSeller, makeDraftListing, submit, dbEnabled } from "./db";

const d = dbEnabled ? describe : describe.skip;

d("function-level hardening", () => {
  it("regular users cannot forge audit log entries; staff can", async () => {
    await withTx(async (tx) => {
      const uid = await tx.createUser("+972503000001");
      const mod = await tx.createUser("+972503000099");
      await tx.grantRole(mod, "moderator");
      await tx.asUser(uid);
      await expect(tx.sql("select public.write_audit('fake', 'x', '1', null, null)")).rejects.toThrow(/AUDIT_WRITE_FORBIDDEN/);
      await tx.asUser(mod);
      await tx.sql("select public.write_audit('listing.note', 'listing', '1', null, null)");
      await tx.asSuper();
      const r = await tx.sql("select actor_role from public.audit_logs where action = 'listing.note'");
      expect(r.rows[0].actor_role).toBe("staff");
    });
  });

  it("users cannot call the rate limiter or create moderation flags directly", async () => {
    await withTx(async (tx) => {
      const { uid, declarationId } = await makeSeller(tx, "+972503000002");
      const id = await makeDraftListing(tx, uid, declarationId);
      await tx.asUser(uid);
      await expect(tx.sql("select public.check_rate_limit('contact_reveal', 'victim', 1, 3600)")).rejects.toThrow(/permission denied/);
      await expect(tx.sql("select public.flag_listing($1, $2, 'manual', 1, '{}')", [id, uid])).rejects.toThrow(/permission denied/);
    });
  });

  it("anonymous users cannot reveal contacts or enumerate listing counts", async () => {
    await withTx(async (tx) => {
      const { uid } = await makeSeller(tx, "+972503000003");
      await tx.asAnon();
      await expect(tx.sql("select public.count_counted_listings($1, null)", [uid])).rejects.toThrow(/permission denied/);
      await expect(tx.sql("select * from public.reveal_seller_contact('00000000-0000-4000-8000-000000000000', 'phone')")).rejects.toThrow(/permission denied/);
    });
  });

  it("a user cannot read another user's listing counts, but can read their own", async () => {
    await withTx(async (tx) => {
      const a = await makeSeller(tx, "+972503000004");
      const b = await makeSeller(tx, "+972503000005");
      const id = await makeDraftListing(tx, a.uid, a.declarationId);
      await submit(tx, a.uid, id);
      await tx.asUser(b.uid);
      await expect(tx.sql("select public.count_counted_listings($1, null)", [a.uid])).rejects.toThrow(/FORBIDDEN/);
      await tx.asUser(a.uid);
      const r = await tx.sql("select public.count_counted_listings($1, null) as n, public.listing_limit_for($1) as l", [a.uid]);
      expect(r.rows[0]).toMatchObject({ n: 1, l: 2 });
    });
  });

  it("the listing limit is still enforced inside the submission trigger", async () => {
    await withTx(async (tx) => {
      const { uid, declarationId } = await makeSeller(tx, "+972503000006");
      const ids = [];
      for (const p of ["1300001", "1300002", "1300003"]) ids.push(await makeDraftListing(tx, uid, declarationId, { plate: p }));
      await submit(tx, uid, ids[0]!);
      await submit(tx, uid, ids[1]!);
      await expect(submit(tx, uid, ids[2]!)).rejects.toThrow(/LISTING_LIMIT_EXCEEDED/);
    });
  });
});
