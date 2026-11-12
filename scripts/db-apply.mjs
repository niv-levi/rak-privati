/**
 * Applies the local shim (tests only), all migrations and the seed to DATABASE_URL.
 * Usage: node scripts/db-apply.mjs [--reset] [--no-shim] [--no-seed]
 * Never point DATABASE_URL at a Supabase project with --reset.
 */
import fs from "node:fs";
import path from "node:path";
import pg from "pg";
import "dotenv/config";

const args = new Set(process.argv.slice(2));
const url = process.env.DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL is required");
  process.exit(1);
}
const isLocal = /localhost|127\.0\.0\.1/.test(url);
if (args.has("--reset") && !isLocal) {
  console.error("--reset is only allowed against a local database");
  process.exit(1);
}
const client = new pg.Client({ connectionString: url });
await client.connect();
try {
  if (args.has("--reset")) {
    await client.query("drop schema if exists public cascade; create schema public; drop schema if exists auth cascade; drop schema if exists storage cascade;");
    await client.query("grant all on schema public to public;");
  }
  if (!args.has("--no-shim") && isLocal) {
    await client.query(fs.readFileSync("supabase/tests/00_local_shim.sql", "utf8"));
    console.log("applied local shim");
  }
  await client.query(`create table if not exists public.schema_migrations (name text primary key, applied_at timestamptz default now())`);
  const dir = "supabase/migrations";
  const files = fs.readdirSync(dir).filter((f) => f.endsWith(".sql")).sort();
  for (const f of files) {
    const { rows } = await client.query("select 1 from public.schema_migrations where name = $1", [f]);
    if (rows.length) continue;
    const sql = fs.readFileSync(path.join(dir, f), "utf8");
    await client.query("begin");
    try {
      await client.query(sql);
      await client.query("insert into public.schema_migrations (name) values ($1)", [f]);
      await client.query("commit");
      console.log("applied", f);
    } catch (e) {
      await client.query("rollback");
      console.error("FAILED", f, e.message);
      process.exit(1);
    }
  }
  if (!args.has("--no-seed")) {
    await client.query(fs.readFileSync("supabase/seed.sql", "utf8"));
    console.log("applied seed");
  }
} finally {
  await client.end();
}
