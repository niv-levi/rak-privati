import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { createSupabaseServerClient, getCurrentUser, createSupabaseAdminClient } from "@/lib/supabase/server";
import { BUCKET } from "@/features/images/urls";

export const runtime = "nodejs";

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string; imageId: string }> }) {
  const { id, imageId } = await params;
  const [user, supabase] = await Promise.all([getCurrentUser(), createSupabaseServerClient()]);
  if (!user || !supabase) return NextResponse.json({ error: "יש להתחבר" }, { status: 401 });
  if (!z.string().uuid().safeParse(id).success || !z.string().uuid().safeParse(imageId).success) return NextResponse.json({ error: "מזהה לא תקין" }, { status: 400 });
  const { data: img } = await supabase.from("listing_images").select("id, storage_path, is_cover, listing_id, listings!inner(seller_id)").eq("id", imageId).eq("listing_id", id).maybeSingle();
  if (!img) return NextResponse.json({ error: "התמונה לא נמצאה" }, { status: 404 });
  const { error } = await supabase.from("listing_images").delete().eq("id", imageId);
  if (error) return NextResponse.json({ error: "לא ניתן למחוק את התמונה במצב הנוכחי" }, { status: 409 });
  const admin = createSupabaseAdminClient();
  if (admin) await admin.storage.from(BUCKET).remove([img.storage_path]);
  if (img.is_cover) {
    const { data: next } = await supabase.from("listing_images").select("id").eq("listing_id", id).order("sort_order").limit(1).maybeSingle();
    if (next) await supabase.from("listing_images").update({ is_cover: true }).eq("id", next.id);
  }
  return NextResponse.json({ ok: true });
}
