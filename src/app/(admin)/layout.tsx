import Link from "next/link";
import { requireRole } from "@/lib/auth/guards";
import { Logo } from "@/components/brand/logo";
import { SkipLink } from "@/components/layout/skip-link";
import { AdminNav } from "@/features/admin/components/admin-nav";
import { roleLabels } from "@/lib/labels";
import { Badge } from "@/components/ui/badge";

/** Header and guards depend on the request's session: never prerender. */
export const dynamic = "force-dynamic";

export const metadata = { robots: { index: false, follow: false } };

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const { roles } = await requireRole("any", "/admin");
  return (
    <>
      <SkipLink />
      <header className="border-b border-border bg-card">
        <div className="container-page flex h-14 items-center justify-between gap-4">
          <div className="flex items-center gap-3"><Link href="/" aria-label="לאתר"><Logo size="sm" /></Link><span className="rounded-full bg-brand-dark px-2.5 py-0.5 text-xs font-bold text-white">ממשק ניהול</span></div>
          <div className="flex items-center gap-2">{roles.map((r) => <Badge key={r} variant="secondary">{roleLabels[r]}</Badge>)}<Link href="/account" className="text-sm font-semibold text-primary underline-offset-4 hover:underline">לחשבון</Link></div>
        </div>
      </header>
      <div className="container-page grid gap-8 py-8 lg:grid-cols-[220px_1fr]">
        <AdminNav />
        <main id="main-content" tabIndex={-1} className="min-w-0 outline-none">{children}</main>
      </div>
    </>
  );
}
