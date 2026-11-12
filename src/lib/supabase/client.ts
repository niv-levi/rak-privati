"use client";
import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getSupabasePublicEnv } from "./env";
import type { Database } from "@/lib/database.types";

let client: SupabaseClient<Database> | null | undefined;

/** Browser client (anon/publishable key only). Returns null when Supabase is not configured. */
export function getBrowserSupabase(): SupabaseClient<Database> | null {
  if (client !== undefined) return client;
  const env = getSupabasePublicEnv();
  client = env ? createBrowserClient<Database>(env.url, env.key) : null;
  return client;
}
