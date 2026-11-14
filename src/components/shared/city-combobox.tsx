"use client";
import * as React from "react";
import { Check, ChevronDown, MapPin } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export type CityItem = { id: string; name_he: string; district_id?: string; is_major?: boolean };

/** Accessible searchable city picker (combobox pattern: input + listbox). */
export function CityCombobox({ id, cities, value, onChange, placeholder = "התחילו להקליד שם יישוב…", invalid }: { id: string; cities: CityItem[]; value: string | null; onChange: (id: string | null, city?: CityItem) => void; placeholder?: string; invalid?: boolean }) {
  const selected = cities.find((c) => c.id === value) ?? null;
  const [query, setQuery] = React.useState(selected?.name_he ?? "");
  const [open, setOpen] = React.useState(false);
  const [active, setActive] = React.useState(0);
  const wrapRef = React.useRef<HTMLDivElement>(null);
  React.useEffect(() => { setQuery(selected?.name_he ?? ""); }, [selected?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const results = React.useMemo(() => {
    const q = query.trim();
    const base = q ? cities.filter((c) => c.name_he.includes(q)) : cities.filter((c) => c.is_major);
    return base.slice(0, 10);
  }, [cities, query]);

  React.useEffect(() => {
    const onDoc = (e: MouseEvent) => { if (!wrapRef.current?.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  const choose = (c: CityItem) => { onChange(c.id, c); setQuery(c.name_he); setOpen(false); };
  const listId = `${id}-listbox`;

  return (
    <div ref={wrapRef} className="relative">
      <div className="relative">
        <MapPin aria-hidden className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          id={id} role="combobox" aria-expanded={open} aria-controls={listId} aria-autocomplete="list" aria-activedescendant={open && results[active] ? `${id}-opt-${results[active]!.id}` : undefined} aria-invalid={invalid || undefined}
          value={query} placeholder={placeholder} autoComplete="off" className="ps-9 pe-9"
          onChange={(e) => { setQuery(e.target.value); setOpen(true); setActive(0); if (selected && e.target.value !== selected.name_he) onChange(null); }}
          onFocus={() => setOpen(true)}
          onKeyDown={(e) => {
            if (e.key === "ArrowDown") { e.preventDefault(); setOpen(true); setActive((a) => Math.min(results.length - 1, a + 1)); }
            else if (e.key === "ArrowUp") { e.preventDefault(); setActive((a) => Math.max(0, a - 1)); }
            else if (e.key === "Enter" && open && results[active]) { e.preventDefault(); choose(results[active]!); }
            else if (e.key === "Escape") setOpen(false);
          }}
        />
        <ChevronDown aria-hidden className="pointer-events-none absolute end-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
      </div>
      {open && (
        <ul id={listId} role="listbox" aria-label="יישובים" className="absolute z-30 mt-1 max-h-64 w-full overflow-y-auto rounded-md border border-border bg-popover p-1 shadow-card-hover">
          {results.length === 0 ? (
            <li className="px-3 py-2 text-sm text-muted-foreground">לא נמצא יישוב. אפשר לבחור את העיר הקרובה ביותר.</li>
          ) : results.map((c, i) => (
            <li key={c.id} id={`${id}-opt-${c.id}`} role="option" aria-selected={c.id === value} onMouseDown={(e) => { e.preventDefault(); choose(c); }} onMouseEnter={() => setActive(i)}
              className={cn("flex cursor-pointer items-center justify-between rounded-sm px-3 py-2 text-sm", i === active && "bg-secondary", c.id === value && "font-semibold")}>
              {c.name_he}{c.id === value && <Check className="size-4 text-primary" aria-hidden />}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
