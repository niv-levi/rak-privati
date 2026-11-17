import type { MetadataRoute } from "next";
import { siteConfig } from "@/lib/config/site";
import { createSupabaseAdminClient } from "@/lib/supabase/server";

export const revalidate = 3600;

const staticPaths = ["", "/cars", "/sell", "/vehicle-check", "/valuation", "/how-it-works", "/about", "/contact", "/help", "/faq", "/accessibility", "/terms", "/privacy", "/cookies", "/private-seller-policy", "/data-sources"];

/** Only active listings are included; pending/removed/expired are never listed. */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = siteConfig.url.replace(/\/$/, "");
  const entries: MetadataRoute.Sitemap = staticPaths.map((p) => ({ url: `${base}${p}`, changeFrequency: p === "/cars" || p === "" ? "hourly" : "monthly", priority: p === "" ? 1 : p === "/cars" ? 0.9 : 0.5 }));
  const admin = createSupabaseAdminClient();
  if (admin) {
    const { data } = await admin.from("listings").select("id, updated_at").eq("status", "active").gt("expires_at", new Date().toISOString()).order("published_at", { ascending: false }).limit(5000);
    for (const l of data ?? []) entries.push({ url: `${base}/cars/${l.id}`, lastModified: l.updated_at, changeFrequency: "daily", priority: 0.7 });
  }
  return entries;
}
