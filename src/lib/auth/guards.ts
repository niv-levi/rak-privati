import "server-only";
import { redirect } from "next/navigation";
import { cache } from "react";
import type { User } from "@supabase/supabase-js";
import { createSupabaseServerClient, getCurrentUser, type ServerSupabase } from "@/lib/supabase/server";
import type { Enums, Tables } from "@/lib/database.types";
import type { HeaderUser } from "@/components/layout/header";

export type Role = Enums<"user_role">;

export const getProfile = cache(async (): Promise<Tables<"profiles"> | null> => {
  const user = await getCurrentUser();
  const supabase = await createSupabaseServerClient();
  if (!user || !supabase) return null;
  const { data } = await supabase.from("profiles").select("*").eq("id", user.id).maybeSingle();
  return data ?? null;
});

export const getRoles = cache(async (): Promise<Role[]> => {
  const user = await getCurrentUser();
  const supabase = await createSupabaseServerClient();
  if (!user || !supabase) return [];
  const { data } = await supabase.from("user_roles").select("role").eq("user_id", user.id);
  return (data ?? []).map((r) => r.role);
});

export const getHeaderUser = cache(async (): Promise<HeaderUser> => {
  const user = await getCurrentUser();
  const supabase = await createSupabaseServerClient();
  if (!user || !supabase) return null;
  const [{ data: profile }, { data: roles }, { count }] = await Promise.all([
    supabase.from("profiles").select("display_name").eq("id", user.id).maybeSingle(),
    supabase.from("user_roles").select("role").eq("user_id", user.id),
    supabase.from("notifications").select("id", { count: "exact", head: true }).eq("user_id", user.id).is("read_at", null),
  ]);
  return { id: user.id, displayName: profile?.display_name ?? null, isAdmin: (roles?.length ?? 0) > 0, unreadNotifications: count ?? 0 };
});

/** Server-side guard for private pages. Redirects to login when unauthenticated. */
export async function requireUser(nextPath?: string): Promise<{ user: User; supabase: ServerSupabase }> {
  const user = await getCurrentUser();
  const supabase = await createSupabaseServerClient();
  if (!user || !supabase) redirect(`/login${nextPath ? `?next=${encodeURIComponent(nextPath)}` : ""}`);
  return { user, supabase };
}

/** Server-side guard for staff pages. 404s (not 403) to avoid revealing admin routes. */
export async function requireRole(allowed: Role[] | "any", nextPath?: string): Promise<{ user: User; supabase: ServerSupabase; roles: Role[] }> {
  const { user, supabase } = await requireUser(nextPath);
  const roles = await getRoles();
  const ok = allowed === "any" ? roles.length > 0 : roles.some((r) => allowed.includes(r) || r === "super_admin");
  if (!ok) {
    const { notFound } = await import("next/navigation");
    notFound();
  }
  return { user, supabase, roles };
}

export function hasRole(roles: Role[], ...allowed: Role[]): boolean {
  return roles.includes("super_admin") || roles.some((r) => allowed.includes(r));
}
