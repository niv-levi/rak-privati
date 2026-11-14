import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { createSupabaseServerClient, getCurrentUser, createSupabaseAdminClient } from "@/lib/supabase/server";
import { processImage, sniffImageType, MAX_UPLOAD_BYTES, hammingDistance } from "@/features/images/process";
import { rateLimit } from "@/lib/security/rate-limit";
import { translateDbError } from "@/lib/actions/result";
import { BUCKET, resolveImageUrls } from "@/features/images/urls";

export const runtime = "nodejs";
export const maxDuration = 60;

const EDITABLE = new Set(["draft", "needs_correction", "pending_review", "active", "paused"]);

async function authorize(listingId: string) {
  const [user, supabase] = await Promise.all([getCurrentUser(), createSupabaseServerClient()]);
  if (!user || !supabase) return { error: NextResponse.json({ error: "יש להתחבר" }, { status: 401 }) } as const;
  if (!z.string().uuid().safeParse(listingId).success) return { error: NextResponse.json({ error: "מזהה לא תקין" }, { status: 400 }) } as const;
  const { data: listing } = await supabase.from("listings").select("id, status, seller_id").eq("id", listingId).eq("seller_id", user.id).maybeSingle();
  if (!listing) return { error: NextResponse.json({ error: "המודעה לא נמצאה" }, { status: 404 }) } as const;
  if (!EDITABLE.has(listing.status)) return { error: NextResponse.json({ error: "לא ניתן לערוך תמונות במצב הנוכחי" }, { status: 409 }) } as const;
  return { user, supabase, listing } as const;
}

/** POST multipart: file, rotate?, crop? (JSON {x,y,w,h} fractions), alt? */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const auth = await authorize(id);
  if ("error" in auth) return auth.error;
  const { user, supabase, listing } = auth;
  if (!(await rateLimit("upload", user.id, 60, 3600))) return NextResponse.json({ error: "יותר מדי העלאות בזמן קצר" }, { status: 429 });

  const form = await req.formData().catch(() => null);
  const file = form?.get("file");
  if (!(file instanceof File)) return NextResponse.json({ error: "לא נבחר קובץ" }, { status: 400 });
  if (file.size > MAX_UPLOAD_BYTES) return NextResponse.json({ error: "הקובץ גדול מדי (עד 12MB)" }, { status: 413 });
  const buf = Buffer.from(await file.arrayBuffer());
  const sniffed = sniffImageType(buf);
  if (!sniffed) return NextResponse.json({ error: "סוג הקובץ אינו נתמך. ניתן להעלות JPG, PNG, WebP, HEIC או AVIF." }, { status: 415 });

  const rotate = Number(form?.get("rotate") ?? 0) || 0;
  let crop: { x: number; y: number; w: number; h: number } | undefined;
  const cropRaw = form?.get("crop");
  if (typeof cropRaw === "string" && cropRaw) {
    const parsed = z.object({ x: z.number().min(0).max(1), y: z.number().min(0).max(1), w: z.number().min(0.05).max(1), h: z.number().min(0.05).max(1) }).safeParse(JSON.parse(cropRaw));
    if (parsed.success) crop = parsed.data;
  }
  const altRaw = form?.get("alt");
  const alt = typeof altRaw === "string" ? altRaw.slice(0, 200) : null;

  let processed;
  try {
    processed = await processImage(buf, { rotate, crop });
  } catch (e) {
    const msg = (e as Error).message === "IMAGE_TOO_SMALL" ? "התמונה קטנה מדי (מינימום 400×300)" : "לא הצלחנו לעבד את התמונה. נסו קובץ אחר.";
    return NextResponse.json({ error: msg }, { status: 422 });
  }

  // Duplicate within the same listing (exact or near-identical)
  const { data: existing } = await supabase.from("listing_images").select("id, content_hash, perceptual_hash").eq("listing_id", listing.id);
  const dup = (existing ?? []).find((e) => e.content_hash === processed.contentHash || (e.perceptual_hash && hammingDistance(e.perceptual_hash, processed.perceptualHash) <= 4));
  if (dup) return NextResponse.json({ error: "התמונה הזו כבר הועלתה למודעה", code: "duplicate" }, { status: 409 });
  if ((existing?.length ?? 0) >= 15) return NextResponse.json({ error: "ניתן להעלות עד 15 תמונות" }, { status: 409 });

  const admin = createSupabaseAdminClient();
  if (!admin) return NextResponse.json({ error: "אחסון הקבצים אינו מוגדר" }, { status: 503 });
  const imageId = crypto.randomUUID();
  const path = `listings/${listing.id}/${imageId}.webp`;
  const { error: upErr } = await admin.storage.from(BUCKET).upload(path, processed.buffer, { contentType: "image/webp", cacheControl: "31536000", upsert: false });
  if (upErr) return NextResponse.json({ error: "העלאה נכשלה: " + upErr.message }, { status: 500 });

  const sortOrder = existing?.length ?? 0;
  const { data: row, error } = await supabase
    .from("listing_images")
    .insert({ id: imageId, listing_id: listing.id, bucket: BUCKET, storage_path: path, sort_order: sortOrder, is_cover: sortOrder === 0, width: processed.width, height: processed.height, bytes: processed.bytes, mime_type: "image/webp", content_hash: processed.contentHash, perceptual_hash: processed.perceptualHash, alt_text: alt, status: "ready" })
    .select("id, storage_path, sort_order, is_cover, alt_text, width, height")
    .single();
  if (error || !row) {
    await admin.storage.from(BUCKET).remove([path]);
    return NextResponse.json({ error: translateDbError(error?.message) }, { status: 400 });
  }
  const urls = await resolveImageUrls([{ storage_path: path }], { persist: false });
  return NextResponse.json({ image: { ...row, url: urls.get(path) ?? null } }, { status: 201 });
}

/** PATCH: { order?: string[]; cover?: string; alt?: { id, text } } */
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const auth = await authorize(id);
  if ("error" in auth) return auth.error;
  const body = await req.json().catch(() => null);
  const schema = z.object({ order: z.array(z.string().uuid()).max(15).optional(), cover: z.string().uuid().optional(), alt: z.object({ id: z.string().uuid(), text: z.string().max(200) }).optional() });
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "בקשה לא תקינה" }, { status: 400 });
  const { supabase, listing } = auth;
  if (parsed.data.order) {
    await Promise.all(parsed.data.order.map((imageId, i) => supabase.from("listing_images").update({ sort_order: i }).eq("id", imageId).eq("listing_id", listing.id)));
  }
  if (parsed.data.cover) {
    await supabase.from("listing_images").update({ is_cover: false }).eq("listing_id", listing.id).eq("is_cover", true);
    const { error } = await supabase.from("listing_images").update({ is_cover: true }).eq("id", parsed.data.cover).eq("listing_id", listing.id);
    if (error) return NextResponse.json({ error: translateDbError(error.message) }, { status: 400 });
  }
  if (parsed.data.alt) {
    await supabase.from("listing_images").update({ alt_text: parsed.data.alt.text || null }).eq("id", parsed.data.alt.id).eq("listing_id", listing.id);
  }
  return NextResponse.json({ ok: true });
}
