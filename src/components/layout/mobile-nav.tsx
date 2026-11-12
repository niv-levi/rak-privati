"use client";
import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, CirclePlus, UserRound, ShieldCheck } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger, SheetDescription } from "@/components/ui/sheet";
import { Logo } from "@/components/brand/logo";
import { mainNav, accountNav } from "@/lib/config/site";
import { cn } from "@/lib/utils";
import type { HeaderUser } from "./header";
import { signOutAction } from "@/features/auth/actions";

export function MobileNav({ user }: { user: HeaderUser }) {
  const [open, setOpen] = React.useState(false);
  const pathname = usePathname();
  React.useEffect(() => setOpen(false), [pathname]);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="lg:hidden" aria-label="פתיחת תפריט">
          <Menu aria-hidden className="size-6" />
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="flex flex-col gap-6">
        <SheetHeader>
          <SheetTitle>
            <Logo size="sm" />
          </SheetTitle>
          <SheetDescription className="sr-only">תפריט ניווט</SheetDescription>
        </SheetHeader>
        <Link href="/sell" className={cn(buttonVariants({ variant: "accent" }), "w-full")}>
          <CirclePlus aria-hidden /> פרסום רכב
        </Link>
        <nav aria-label="ניווט ראשי">
          <ul className="flex flex-col">
            {mainNav.map((item) => (
              <li key={item.href}>
                <Link href={item.href} className="block rounded-md px-3 py-3 text-base font-semibold hover:bg-secondary">
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        <div className="border-t border-border pt-4">
          {user ? (
            <nav aria-label="החשבון שלי">
              <p className="px-3 pb-2 text-xs font-semibold text-muted-foreground">שלום, {user.displayName || "משתמש"}</p>
              <ul className="flex flex-col">
                {accountNav.slice(0, 6).map((item) => (
                  <li key={item.href}>
                    <Link href={item.href} className="block rounded-md px-3 py-2.5 text-sm font-semibold hover:bg-secondary">
                      {item.label}
                    </Link>
                  </li>
                ))}
                {user.isAdmin && (
                  <li>
                    <Link href="/admin" className="flex items-center gap-2 rounded-md px-3 py-2.5 text-sm font-semibold hover:bg-secondary">
                      <ShieldCheck aria-hidden className="size-4" /> ממשק ניהול
                    </Link>
                  </li>
                )}
                <li>
                  <form action={signOutAction}>
                    <button type="submit" className="block w-full rounded-md px-3 py-2.5 text-start text-sm font-semibold text-destructive hover:bg-secondary">
                      יציאה מהחשבון
                    </button>
                  </form>
                </li>
              </ul>
            </nav>
          ) : (
            <Link href="/login" className={cn(buttonVariants({ variant: "outline" }), "w-full")}>
              <UserRound aria-hidden /> כניסה עם מספר טלפון
            </Link>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
