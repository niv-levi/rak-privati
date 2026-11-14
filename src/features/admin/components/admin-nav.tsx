"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { adminNav } from "@/lib/config/site";
import { cn } from "@/lib/utils";

export function AdminNav() {
  const pathname = usePathname();
  return (
    <nav aria-label="ניווט ניהול" className="lg:sticky lg:top-6 lg:self-start">
      <ul className="flex gap-1 overflow-x-auto pb-2 scrollbar-none lg:flex-col lg:overflow-visible">
        {adminNav.map((i) => {
          const active = i.href === "/admin" ? pathname === "/admin" : pathname.startsWith(i.href);
          return <li key={i.href} className="shrink-0"><Link href={i.href} aria-current={active ? "page" : undefined} className={cn("block whitespace-nowrap rounded-md px-3 py-2 text-sm font-semibold", active ? "bg-brand-dark text-white" : "hover:bg-secondary")}>{i.label}</Link></li>;
        })}
      </ul>
    </nav>
  );
}
