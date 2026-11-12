import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { buttonVariants } from "./button";

export function Pagination({ page, totalPages, hrefFor, className }: { page: number; totalPages: number; hrefFor: (p: number) => string; className?: string }) {
  if (totalPages <= 1) return null;
  const pages: number[] = [];
  const start = Math.max(1, page - 2);
  const end = Math.min(totalPages, page + 2);
  for (let p = start; p <= end; p++) pages.push(p);
  return (
    <nav aria-label="ניווט בין עמודי תוצאות" className={cn("flex items-center justify-center gap-1", className)}>
      {page > 1 ? (
        <Link href={hrefFor(page - 1)} className={buttonVariants({ variant: "outline", size: "sm" })} rel="prev">
          <ChevronRight aria-hidden /> הקודם
        </Link>
      ) : (
        <span className={cn(buttonVariants({ variant: "outline", size: "sm" }), "opacity-50")} aria-disabled>
          <ChevronRight aria-hidden /> הקודם
        </span>
      )}
      <ul className="flex items-center gap-1 mx-2">
        {start > 1 && <li className="text-muted-foreground px-1">…</li>}
        {pages.map((p) => (
          <li key={p}>
            <Link
              href={hrefFor(p)}
              aria-current={p === page ? "page" : undefined}
              className={cn(buttonVariants({ variant: p === page ? "default" : "ghost", size: "sm" }), "min-w-9 num")}
            >
              {p}
            </Link>
          </li>
        ))}
        {end < totalPages && <li className="text-muted-foreground px-1">…</li>}
      </ul>
      {page < totalPages ? (
        <Link href={hrefFor(page + 1)} className={buttonVariants({ variant: "outline", size: "sm" })} rel="next">
          הבא <ChevronLeft aria-hidden />
        </Link>
      ) : (
        <span className={cn(buttonVariants({ variant: "outline", size: "sm" }), "opacity-50")} aria-disabled>
          הבא <ChevronLeft aria-hidden />
        </span>
      )}
    </nav>
  );
}
