import type { Tables } from "@/lib/database.types";
import type { MakeOption, ModelOption, CityOption } from "@/features/listings/queries/catalog";
import type { UploadedImage } from "./image-uploader";

export type TrimOption = { id: string; model_id: string; name_he: string; engine_cc: number | null; fuel_type: string | null; transmission: string | null };

export type WizardData = {
  listing: Tables<"listings">;
  plate: string | null;
  images: UploadedImage[];
  makes: MakeOption[];
  models: ModelOption[];
  trims: TrimOption[];
  cities: CityOption[];
  profile: { display_name: string | null; phone_masked: string };
  hasActiveDeclaration: boolean;
  limits: { maxActive: number; counted: number };
};
