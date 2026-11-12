import "server-only";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { createClient, type SupabaseClient, type User } from "@supabase/supabase-js";
import { cache } from "react";
import { getSupabasePublicEnv } from "./env";
import type { Database } from "@/lib/database.types";

export type ServerSupabase = SupabaseClient<Database>;

/**
 * Request-scoped Supabase client bound to the user's session cookies.
 * Returns null if Supabase is not configured — callers must degrade gracefully.
 */
export const createSupabaseServerClient = cache(async (): Promise<ServerSupabase | null> => {
  const env = getSupabasePublicEnv();
  if (!env) return null;
  const cookieStore = await cookies();
  return createServerClient<Database>(env.url, env.key, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
        } catch {
          // Called from a Server Component: cookies are refreshed by proxy.ts instead.
        }
      },
    },
  });
});

/**
 * Service-role client. SERVER ONLY. Never import from client components.
 * Used for privileged operations after explicit authorization checks.
 */
export function createSupabaseAdminClient(): ServerSupabase | null {
  const env = getSupabasePublicEnv();
  const secret = process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!env || !secret) return null;
  return createClient<Database>(env.url, secret, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

/** Authenticated user from the verified session (uses getUser, never trusts the cookie JWT alone). */
export const getCurrentUser = cache(async (): Promise<User | null> => {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return null;
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) return null;
  return data.user;
});
