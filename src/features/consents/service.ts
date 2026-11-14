import "server-only";
import type { ServerSupabase } from "@/lib/supabase/server";
import type { Enums } from "@/lib/database.types";

export type ConsentType = Enums<"consent_type">;

export async function getCurrentPolicyVersion(supabase: ServerSupabase, type: ConsentType) {
  const { data } = await supabase.from("policy_versions").select("id, version, title, summary").eq("policy_type", type).eq("is_current", true).maybeSingle();
  return data;
}

/** Records a versioned, immutable consent event for the current user. */
export async function recordConsent(
  supabase: ServerSupabase,
  userId: string,
  type: ConsentType,
  granted: boolean,
  meta: { ipHash?: string | null; userAgent?: string | null; metadata?: Record<string, unknown> } = {}
) {
  const policy = await getCurrentPolicyVersion(supabase, type);
  const { data, error } = await supabase
    .from("consent_records")
    .insert({
      user_id: userId,
      consent_type: type,
      policy_version_id: policy?.id ?? null,
      version: policy?.version ?? "unversioned",
      granted,
      ip_hash: meta.ipHash ?? null,
      user_agent: meta.userAgent ? meta.userAgent.slice(0, 300) : null,
      metadata: (meta.metadata ?? {}) as never,
    })
    .select("id, version")
    .single();
  if (error) throw new Error(error.message);
  return data;
}

export async function hasCurrentConsent(supabase: ServerSupabase, userId: string, type: ConsentType): Promise<boolean> {
  const policy = await getCurrentPolicyVersion(supabase, type);
  const { data } = await supabase
    .from("consent_records")
    .select("id")
    .eq("user_id", userId)
    .eq("consent_type", type)
    .eq("granted", true)
    .eq("version", policy?.version ?? "unversioned")
    .order("granted_at", { ascending: false })
    .limit(1);
  return (data?.length ?? 0) > 0;
}

/** Latest non-revoked private-seller declaration for the user, if any. */
export async function getActiveDeclaration(supabase: ServerSupabase, userId: string) {
  const { data } = await supabase
    .from("seller_declarations")
    .select("id, declaration_version, declared_at")
    .eq("user_id", userId)
    .is("revoked_at", null)
    .order("declared_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  return data;
}

export { PRIVATE_SELLER_DECLARATION_TEXT } from "./text";
