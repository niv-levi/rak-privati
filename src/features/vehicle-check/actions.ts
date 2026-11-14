"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { lookupVehicle, type LookupOutcome } from "./service";
import { getCurrentUser, createSupabaseServerClient } from "@/lib/supabase/server";
import { getClientIp } from "@/lib/security/request";
import { fail, succeed, translateDbError, type ActionResult } from "@/lib/actions/result";

export async function lookupVehicleAction(plate: string, purpose: "check" | "sell" = "check"): Promise<LookupOutcome> {
  const user = await getCurrentUser();
  const ip = await getClientIp();
  return lookupVehicle({ plate, userId: user?.id ?? null, ip, purpose });
}

export async function saveVehicleReportAction(resultId: string, title?: string): Promise<ActionResult<{ id: string }>> {
  const [user, supabase] = await Promise.all([getCurrentUser(), createSupabaseServerClient()]);
  if (!user || !supabase) return fail("יש להתחבר כדי לשמור דוחות.", { code: "auth" });
  if (!z.string().uuid().safeParse(resultId).success) return fail("מזהה לא תקין");
  const { data, error } = await supabase.from("saved_vehicle_reports").upsert({ user_id: user.id, lookup_result_id: resultId, title: title ?? null }, { onConflict: "user_id,lookup_result_id" }).select("id").single();
  if (error) return fail(translateDbError(error.message));
  revalidatePath("/account/vehicle-checks");
  return succeed({ id: data.id }, "הדוח נשמר בחשבון שלך");
}

export async function deleteSavedReportAction(id: string): Promise<ActionResult> {
  const [user, supabase] = await Promise.all([getCurrentUser(), createSupabaseServerClient()]);
  if (!user || !supabase) return fail("יש להתחבר.");
  await supabase.from("saved_vehicle_reports").delete().eq("id", id).eq("user_id", user.id);
  revalidatePath("/account/vehicle-checks");
  return succeed(undefined);
}
