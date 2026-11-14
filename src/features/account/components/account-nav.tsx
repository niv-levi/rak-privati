"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { accountNav } from "@/lib/config/site";
import { cn } from "@/lib/utils";

export function AccountNav({ displayName }: { displayName: string | null }) {
  const pathname = usePathname();
  return (
    <aside className="lg:sticky lg:top-24 lg:self-start">
      <p className="mb-3 px-3 text-sm text-muted-foreground">שלום, <strong className="text-foreground">{displayName || "משתמש"}</strong></p>
      <nav aria-label="ניווט בחשבון">
        <ul className="flex gap-1 overflow-x-auto pb-2 scrollbar-none lg:flex-col lg:overflow-visible">
          {accountNav.map((item) => {
            const active = item.href === "/account" ? pathname === "/account" : pathname.startsWith(item.href);
            return (
              <li key={item.href} className="shrink-0">
                <Link href={item.href} aria-current={active ? "page" : undefined} className={cn("block whitespace-nowrap rounded-md px-3 py-2 text-sm font-semibold transition-colors", active ? "bg-primary text-white" : "text-foreground/80 hover:bg-secondary", item.href === "/account/delete" && !active && "text-muted-foreground")}>
                  {item.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </aside>
  );
}
