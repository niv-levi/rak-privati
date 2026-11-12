import Link from "next/link";
import { Bell, CirclePlus, UserRound } from "lucide-react";
import { Logo } from "@/components/brand/logo";
import { Button, buttonVariants } from "@/components/ui/button";
import { mainNav } from "@/lib/config/site";
import { cn } from "@/lib/utils";
import { MobileNav } from "./mobile-nav";
import { UserMenu } from "./user-menu";

export type HeaderUser = { id: string; displayName: string | null; isAdmin: boolean; unreadNotifications: number } | null;

export function Header({ user }: { user: HeaderUser }) {
  return (
    <header className="sticky top-0 z-40 border-b border-border/80 bg-background/90 backdrop-blur supports-[backdrop-filter]:bg-background/75">
      <div className="container-page flex h-16 items-center justify-between gap-4">
        <div className="flex items-center gap-6">
          <Link href="/" className="rounded-md focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring" aria-label="רק פרטי – דף הבית">
            <Logo />
          </Link>
          <nav aria-label="ניווט ראשי" className="hidden lg:block">
            <ul className="flex items-center gap-1">
              {mainNav.map((item) => (
                <li key={item.href}>
                  <Link href={item.href} className="rounded-md px-3 py-2 text-sm font-semibold text-foreground/80 transition-colors hover:bg-secondary hover:text-brand-dark focus-visible:outline-2 focus-visible:outline-ring">
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/sell" className={cn(buttonVariants({ variant: "accent", size: "sm" }), "hidden sm:inline-flex")}>
            <CirclePlus aria-hidden /> פרסום רכב
          </Link>
          {user ? (
            <>
              <Link href="/account/notifications" className={cn(buttonVariants({ variant: "ghost", size: "icon-sm" }), "relative hidden md:inline-flex")} aria-label={user.unreadNotifications > 0 ? `התראות, ${user.unreadNotifications} חדשות` : "התראות"}>
                <Bell aria-hidden />
                {user.unreadNotifications > 0 && <span aria-hidden className="absolute end-1.5 top-1.5 size-2 rounded-full bg-accent" />}
              </Link>
              <div className="hidden md:block">
                <UserMenu displayName={user.displayName} isAdmin={user.isAdmin} />
              </div>
            </>
          ) : (
            <Button asChild variant="outline" size="sm" className="hidden md:inline-flex">
              <Link href="/login">
                <UserRound aria-hidden /> כניסה
              </Link>
            </Button>
          )}
          <MobileNav user={user} />
        </div>
      </div>
    </header>
  );
}
