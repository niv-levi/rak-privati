"use client";
import * as React from "react";
import Image from "next/image";
import { ChevronLeft, ChevronRight, Expand, Car } from "lucide-react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type GalleryImage = { id: string; url: string; alt: string | null; width?: number | null; height?: number | null };

export function Gallery({ images, title }: { images: GalleryImage[]; title: string }) {
  const [index, setIndex] = React.useState(0);
  const [open, setOpen] = React.useState(false);
  const count = images.length;
  const go = React.useCallback((d: number) => setIndex((i) => (count ? (i + d + count) % count : 0)), [count]);

  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowLeft") { e.preventDefault(); go(1); }   // RTL: left = next
    if (e.key === "ArrowRight") { e.preventDefault(); go(-1); }
  };

  if (!count) {
    return (
      <div className="flex aspect-[4/3] w-full items-center justify-center rounded-lg bg-secondary text-muted-foreground"><Car className="size-12" aria-hidden /><span className="sr-only">אין תמונות</span></div>
    );
  }
  const current = images[index]!;
  const alt = current.alt || `${title} – תמונה ${index + 1} מתוך ${count}`;

  return (
    <section aria-label="גלריית תמונות" className="space-y-3">
      <div className="relative aspect-[4/3] w-full overflow-hidden rounded-lg bg-brand-dark/5" onKeyDown={onKey} tabIndex={0} role="group" aria-roledescription="קרוסלה" aria-label={`תמונה ${index + 1} מתוך ${count}`}>
        <Image key={current.id} src={current.url} alt={alt} fill sizes="(max-width: 1024px) 100vw, 66vw" className="object-contain" priority unoptimized={current.url.includes("token=")} />
        {count > 1 && (
          <>
            <Button type="button" size="icon" variant="outline" className="absolute end-3 top-1/2 -translate-y-1/2 rounded-full bg-card/90" onClick={() => go(-1)} aria-label="התמונה הקודמת"><ChevronRight aria-hidden /></Button>
            <Button type="button" size="icon" variant="outline" className="absolute start-3 top-1/2 -translate-y-1/2 rounded-full bg-card/90" onClick={() => go(1)} aria-label="התמונה הבאה"><ChevronLeft aria-hidden /></Button>
          </>
        )}
        <Button type="button" size="sm" variant="outline" className="absolute bottom-3 start-3 bg-card/90" onClick={() => setOpen(true)}><Expand aria-hidden /> הגדלה</Button>
        <span className="absolute bottom-3 end-3 rounded-full bg-brand-dark/70 px-2.5 py-1 text-xs font-semibold text-white num" aria-hidden>{index + 1} / {count}</span>
      </div>
      {count > 1 && (
        <ul className="flex gap-2 overflow-x-auto pb-1 scrollbar-none" aria-label="תמונות ממוזערות">
          {images.map((img, i) => (
            <li key={img.id} className="shrink-0">
              <button type="button" onClick={() => setIndex(i)} aria-label={`הצגת תמונה ${i + 1}`} aria-current={i === index ? "true" : undefined} className={cn("relative size-16 overflow-hidden rounded-md border-2 sm:size-20 focus-visible:outline-2 focus-visible:outline-ring", i === index ? "border-primary" : "border-transparent opacity-80 hover:opacity-100")}>
                <Image src={img.url} alt="" fill sizes="80px" className="object-cover" unoptimized={img.url.includes("token=")} />
              </button>
            </li>
          ))}
        </ul>
      )}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-6xl bg-brand-dark p-2 border-0 text-white" aria-describedby={undefined}>
          <DialogTitle className="sr-only">תצוגה מוגדלת של {title}</DialogTitle>
          <div className="relative aspect-[4/3] w-full" onKeyDown={onKey} tabIndex={0}>
            <Image src={current.url} alt={alt} fill sizes="100vw" className="object-contain" unoptimized={current.url.includes("token=")} />
            {count > 1 && (
              <>
                <Button type="button" size="icon" variant="outline" className="absolute end-3 top-1/2 -translate-y-1/2 rounded-full" onClick={() => go(-1)} aria-label="התמונה הקודמת"><ChevronRight aria-hidden /></Button>
                <Button type="button" size="icon" variant="outline" className="absolute start-3 top-1/2 -translate-y-1/2 rounded-full" onClick={() => go(1)} aria-label="התמונה הבאה"><ChevronLeft aria-hidden /></Button>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </section>
  );
}
