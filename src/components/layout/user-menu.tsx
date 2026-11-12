"use client";
import Link from "next/link";
import { ChevronDown, UserRound } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { accountNav } from "@/lib/config/site";
import { signOutAction } from "@/features/auth/actions";

export function UserMenu({ displayName, isAdmin }: { displayName: string | null; isAdmin: boolean }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" aria-label="תפריט החשבון שלי">
          <UserRound aria-hidden />
          <span className="max-w-[10rem] truncate">{displayName || "החשבון שלי"}</span>
          <ChevronDown aria-hidden className="size-3.5" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuLabel>החשבון שלי</DropdownMenuLabel>
        {accountNav.slice(0, 6).map((item) => (
          <DropdownMenuItem key={item.href} asChild>
            <Link href={item.href}>{item.label}</Link>
          </DropdownMenuItem>
        ))}
        {isAdmin && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link href="/admin">ממשק ניהול</Link>
            </DropdownMenuItem>
          </>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={() => signOutAction()}>יציאה מהחשבון</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
