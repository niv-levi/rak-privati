/**
 * Integration-test harness for the SQL layer. Runs against a local Postgres with the
 * Supabase shim applied (npm run db:reset:local). Each test runs inside a transaction that
 * is rolled back, and switches roles the same way PostgREST does.
 */
import pg from "pg";

export const DB_URL = process.env.DATABASE_URL ?? "postgresql://postgres:postgres@localhost:5432/rak_privati_test";
export const dbEnabled = process.env.RUN_DB_TESTS === "1";

export type Tx = {
  sql: <T extends pg.QueryResultRow = pg.QueryResultRow>(text: string, params?: unknown[]) => Promise<pg.QueryResult<T>>;
  asUser: (uid: string) => Promise<void>;
  asAnon: () => Promise<void>;
  asService: () => Promise<void>;
  asSuper: () => Promise<void>;
  createUser: (phone: string) => Promise<string>;
  grantRole: (uid: string, role: string) => Promise<void>;
  client: pg.PoolClient;
};

let pool: pg.Pool | null = null;
export function getPool() {
  pool ??= new pg.Pool({ connectionString: DB_URL, max: 4 });
  return pool;
}

export async function withTx(fn: (tx: Tx) => Promise<void>) {
  const client = await getPool().connect();
  await client.query("begin");
  const tx: Tx = {
    client,
    sql: async (text, params) => {
      // Savepoint per statement so an expected error does not abort the whole test transaction.
      await client.query("savepoint stmt");
      try {
        const res = await client.query(text, params as never[]);
        await client.query("release savepoint stmt");
        return res;
      } catch (e) {
        await client.query("rollback to savepoint stmt");
        throw e;
      }
    },
    asUser: async (uid) => {
      await client.query("reset role");
      await client.query("select set_config('request.jwt.claim.sub', $1, true), set_config('request.jwt.claim.role', 'authenticated', true)", [uid]);
      await client.query("set local role authenticated");
    },
    asAnon: async () => {
      await client.query("reset role");
      await client.query("select set_config('request.jwt.claim.sub', '', true), set_config('request.jwt.claim.role', 'anon', true)");
      await client.query("set local role anon");
    },
    asService: async () => {
      await client.query("reset role");
      await client.query("select set_config('request.jwt.claim.sub', '', true), set_config('request.jwt.claim.role', 'service_role', true)");
      await client.query("set local role service_role");
    },
    asSuper: async () => {
      await client.query("reset role");
      await client.query("select set_config('request.jwt.claim.sub', '', true), set_config('request.jwt.claim.role', '', true)");
    },
    createUser: async (phone) => {
      await client.query("reset role");
      const { rows } = await client.query("insert into auth.users (phone, phone_confirmed_at) values ($1, now()) returning id", [phone]);
      return rows[0].id as string;
    },
    grantRole: async (uid, role) => {
      await client.query("reset role");
      await client.query("select set_config('request.jwt.claim.role', 'service_role', true)");
      await client.query("set local role service_role");
      await client.query("insert into public.user_roles (user_id, role) values ($1, $2::public.user_role)", [uid, role]);
      await client.query("reset role");
    },
  };
  try {
    await fn(tx);
  } finally {
    await client.query("rollback").catch(() => {});
    client.release();
  }
}

/** Creates an eligible seller with a declaration; returns ids. */
export async function makeSeller(tx: Tx, phone: string) {
  const uid = await tx.createUser(phone);
  await tx.asUser(uid);
  const consent = await tx.sql<{ id: string }>(
    "insert into public.consent_records (user_id, consent_type, version, granted) values ($1, 'private_seller_declaration', 'v1', true) returning id",
    [uid]
  );
  const decl = await tx.sql<{ id: string }>(
    "insert into public.seller_declarations (user_id, consent_record_id, declaration_version) values ($1, $2, 'v1') returning id",
    [uid, consent.rows[0].id]
  );
  return { uid, declarationId: decl.rows[0].id };
}

/** Creates a complete draft listing with 3 ready images for the current user. */
export async function makeDraftListing(tx: Tx, uid: string, declarationId: string, overrides: Record<string, unknown> = {}) {
  await tx.asSuper();
  const make = await tx.sql<{ id: string }>("select id from public.vehicle_makes where slug = 'toyota'");
  const model = await tx.sql<{ id: string }>("select id from public.vehicle_models where slug = 'corolla'");
  const city = await tx.sql<{ id: string; district_id: string }>("select id, district_id from public.geo_cities where name_he = 'חיפה'");
  await tx.asUser(uid);
  const plate = (overrides.plate as string) ?? "1234567";
  const { rows } = await tx.sql<{ id: string }>(
    `insert into public.listings (seller_id, declaration_id, plate_hash, plate_masked, make_id, model_id, make_name, model_name, year, mileage_km, price, city_id, district_id, fuel_type, transmission, description, contact_phone_opt_in)
     values ($1, $2, $3, $4, $5, $6, 'טויוטה', 'קורולה', $7, $8, $9, $10, $11, 'petrol', 'automatic', $12, true) returning id`,
    [
      uid, declarationId, "hash_" + plate, "••-•••-" + plate.slice(-2), make.rows[0].id, model.rows[0].id,
      overrides.year ?? 2020, overrides.mileage_km ?? 60000, overrides.price ?? 85000, city.rows[0].id, city.rows[0].district_id,
      overrides.description ?? "רכב שמור מאוד, יד ראשונה, טיפולים במוסך מורשה בלבד. ללא תאונות. מחיר גמיש במעט לרציניים.",
    ]
  );
  const id = rows[0].id;
  await tx.sql("insert into public.listing_private_data (listing_id, plate_number) values ($1, $2)", [id, plate]);
  for (let i = 0; i < 3; i++) {
    await tx.sql(
      "insert into public.listing_images (listing_id, storage_path, sort_order, is_cover, status, content_hash) values ($1, $2, $3, $4, 'ready', $5)",
      [id, `listings/${id}/${i}-${plate}.webp`, i, i === 0, (overrides.imageHashPrefix ?? "img_") + plate + "_" + i]
    );
  }
  return id;
}

export async function submit(tx: Tx, uid: string, listingId: string) {
  await tx.asUser(uid);
  await tx.sql("update public.listings set status = 'pending_review' where id = $1", [listingId]);
}

export async function approve(tx: Tx, moderatorUid: string, listingId: string) {
  await tx.asUser(moderatorUid);
  await tx.sql("update public.listings set status = 'active' where id = $1", [listingId]);
}
