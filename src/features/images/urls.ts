import "server-only";
import { createSupabaseAdminClient } from "@/lib/supabase/server";

const SIGNED_TTL_SECONDS = 7 * 24 * 3600;
const REFRESH_BEFORE_MS = 24 * 3600 * 1000;
export const BUCKET = "listing-images";

type ImageRef = { storage_path: string; public_url?: string | null; public_url_expires_at?: string | null };

/**
 * Returns a browser-loadable URL for a listing image. Public listings get a long-lived signed URL
 * cached on the row so all visitors share it (bucket is private: pending images never get one).
 * Set `persist=false` for owner/admin previews so private previews are never cached as "public".
 */
export async function resolveImageUrls<T extends ImageRef>(images: T[], opts: { persist: boolean }): Promise<Map<string, string>> {
  const out = new Map<string, string>();
  const admin = createSupabaseAdminClient();
  const toSign: T[] = [];
  const now = Date.now();
  for (const img of images) {
    if (opts.persist && img.public_url && img.public_url_expires_at && new Date(img.public_url_expires_at).getTime() - now > REFRESH_BEFORE_MS) {
      out.set(img.storage_path, img.public_url);
    } else {
      toSign.push(img);
    }
  }
  if (!toSign.length || !admin) return out;
  const { data, error } = await admin.storage.from(BUCKET).createSignedUrls(toSign.map((i) => i.storage_path), SIGNED_TTL_SECONDS);
  if (error || !data) {
    console.error("[images] signing failed", error?.message);
    return out;
  }
  const expires = new Date(now + SIGNED_TTL_SECONDS * 1000).toISOString();
  await Promise.all(
    data.map(async (d, i) => {
      if (!d.signedUrl) return;
      const path = toSign[i]!.storage_path;
      out.set(path, d.signedUrl);
      if (opts.persist) {
        await admin.from("listing_images").update({ public_url: d.signedUrl, public_url_expires_at: expires }).eq("storage_path", path);
      }
    })
  );
  return out;
}

export async function resolveCoverUrl(path: string | null, cached: string | null): Promise<string | null> {
  if (!path) return null;
  if (cached) return cached;
  const map = await resolveImageUrls([{ storage_path: path }], { persist: true });
  return map.get(path) ?? null;
}
