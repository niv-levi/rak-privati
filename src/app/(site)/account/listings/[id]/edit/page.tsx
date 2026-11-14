import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth/guards";
import { getMakes, getModels, getGeo } from "@/features/listings/queries/catalog";
import { resolveImageUrls } from "@/features/images/urls";
import { ListingWizard } from "@/features/sell/components/listing-wizard";
import { ActiveListingEditor } from "@/features/sell/components/active-listing-editor";
import { getActiveDeclaration } from "@/features/consents/service";
import { maskPhone } from "@/lib/format";
import { PageHeader } from "@/components/layout/page-header";
import type { WizardData } from "@/features/sell/components/wizard-types";

export const metadata: Metadata = { title: "עריכת מודעה", robots: { index: false } };

export default async function EditListingPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const { id } = await params;
  const sp = await searchParams;
  const { user, supabase } = await requireUser(`/account/listings/${id}/edit`);
  const { data: listing } = await supabase.from("listings").select("*").eq("id", id).eq("seller_id", user.id).maybeSingle();
  if (!listing) notFound();

  const [priv, imgs, makes, models, trims, geo, profile, decl, limitRes, countRes] = await Promise.all([
    supabase.from("listing_private_data").select("plate_number").eq("listing_id", id).maybeSingle(),
    supabase.from("listing_images").select("id, storage_path, sort_order, is_cover, alt_text, public_url, public_url_expires_at").eq("listing_id", id).order("sort_order"),
    getMakes(), getModels(),
    listing.model_id ? supabase.from("vehicle_trims").select("id, model_id, name_he, engine_cc, fuel_type, transmission").eq("model_id", listing.model_id).eq("active", true) : Promise.resolve({ data: [] }),
    getGeo(),
    supabase.from("profiles").select("display_name, phone_e164").eq("id", user.id).single(),
    getActiveDeclaration(supabase, user.id),
    supabase.rpc("listing_limit_for", { p_user: user.id }),
    supabase.rpc("count_counted_listings", { p_user: user.id, p_exclude: id }),
  ]);
  const urls = await resolveImageUrls(imgs.data ?? [], { persist: listing.status === "active" });
  const data: WizardData = {
    listing,
    plate: priv.data?.plate_number ?? null,
    images: (imgs.data ?? []).map((i) => ({ id: i.id, storage_path: i.storage_path, sort_order: i.sort_order, is_cover: i.is_cover, alt_text: i.alt_text, url: urls.get(i.storage_path) ?? null })),
    makes, models, trims: trims.data ?? [], cities: geo.cities,
    profile: { display_name: profile.data?.display_name ?? null, phone_masked: maskPhone(profile.data?.phone_e164) },
    hasActiveDeclaration: !!decl,
    limits: { maxActive: limitRes.data ?? 2, counted: countRes.data ?? 0 },
  };
  const initialPlate = typeof sp.plate === "string" ? sp.plate : undefined;
  const wizardMode = ["draft", "needs_correction"].includes(listing.status);

  return (
    <div className="container-page pb-16">
      <PageHeader eyebrow={wizardMode ? "פרסום רכב" : "עריכת מודעה"} title={wizardMode ? "פרסום רכב למכירה" : `${listing.make_name ?? ""} ${listing.model_name ?? ""}`.trim() || "עריכת מודעה"} description={wizardMode ? "התקדמות נשמרת אוטומטית בכל שלב – אפשר לעצור ולחזור מאוחר יותר." : undefined} />
      {wizardMode ? <ListingWizard data={data} initialPlate={initialPlate} /> : <ActiveListingEditor data={data} />}
    </div>
  );
}
