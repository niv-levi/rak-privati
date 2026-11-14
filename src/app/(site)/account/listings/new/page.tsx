import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth/guards";
import { createDraftAction } from "@/features/sell/actions";

export const metadata = { title: "פרסום מודעה חדשה", robots: { index: false } };

export default async function NewListingPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  await requireUser("/account/listings/new");
  const sp = await searchParams;
  const plate = typeof sp.plate === "string" ? sp.plate : undefined;
  await createDraftAction(plate); // redirects to the wizard
  redirect("/account/listings");
}
