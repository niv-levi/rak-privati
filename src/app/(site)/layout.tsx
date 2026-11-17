import { SiteShell } from "@/components/layout/site-shell";
import { getHeaderUser } from "@/lib/auth/guards";
import { ConfigBanner } from "@/components/shared/config-banner";

/** Header and guards depend on the request's session: never prerender. */
export const dynamic = "force-dynamic";

export default async function SiteLayout({ children }: { children: React.ReactNode }) {
  const user = await getHeaderUser();
  return (
    <SiteShell user={user}>
      <ConfigBanner />
      {children}
    </SiteShell>
  );
}
