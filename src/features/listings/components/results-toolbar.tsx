"use client";
import { useRouter, usePathname } from "next/navigation";
import { LayoutGrid, List, BookmarkPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/select";
import { filtersToQuery, sortOptions, type SearchFilters } from "../search-params";
import { SaveSearchDialog } from "./save-search-dialog";

export function ResultsToolbar({ filters, total, loggedIn }: { filters: SearchFilters; total: number; loggedIn: boolean }) {
  const router = useRouter();
  const pathname = usePathname();
  const go = (patch: Partial<SearchFilters>) => router.push(`${pathname}${filtersToQuery({ ...filters, ...patch, page: 1 })}`);
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-sm text-muted-foreground" role="status" aria-live="polite">
        {total === 0 ? "לא נמצאו רכבים" : <>נמצאו <strong className="text-foreground num">{total.toLocaleString("he-IL")}</strong> רכבים ממוכרים פרטיים</>}
      </p>
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-2">
          <Label htmlFor="sort" className="text-sm font-normal text-muted-foreground">מיון</Label>
          <NativeSelect id="sort" value={filters.sort} onChange={(e) => go({ sort: e.target.value as SearchFilters["sort"] })} className="h-9 w-48 text-sm">
            {sortOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </NativeSelect>
        </div>
        <div className="hidden sm:flex items-center rounded-md border border-border bg-card p-0.5" role="group" aria-label="תצוגה">
          <Button type="button" size="icon-sm" variant={filters.view === "grid" ? "secondary" : "ghost"} aria-pressed={filters.view === "grid"} aria-label="תצוגת רשת" onClick={() => go({ view: "grid" })}><LayoutGrid aria-hidden /></Button>
          <Button type="button" size="icon-sm" variant={filters.view === "list" ? "secondary" : "ghost"} aria-pressed={filters.view === "list"} aria-label="תצוגת רשימה" onClick={() => go({ view: "list" })}><List aria-hidden /></Button>
        </div>
        <SaveSearchDialog filters={filters} loggedIn={loggedIn}>
          <Button type="button" variant="outline" size="sm"><BookmarkPlus aria-hidden /> שמירת חיפוש</Button>
        </SaveSearchDialog>
      </div>
    </div>
  );
}
