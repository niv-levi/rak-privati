"use client";
import * as React from "react";
import { RotateCcw, RotateCw } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

export type EditState = { rotate: number; crop: { x: number; y: number; w: number; h: number } | null; aspect: number | null };

const ASPECTS: { label: string; value: number | null }[] = [
  { label: "מקורי", value: null },
  { label: "4:3", value: 4 / 3 },
  { label: "16:9", value: 16 / 9 },
  { label: "1:1", value: 1 },
];

/**
 * Lightweight rotate/crop editor. Crop is expressed as fractions of the rotated image so the
 * server can apply the exact same frame. Keyboard: arrow keys move the frame.
 */
export function ImageEditor({ open, onOpenChange, src, initial, onApply }: { open: boolean; onOpenChange: (v: boolean) => void; src: string; initial: EditState; onApply: (s: EditState) => void }) {
  const [rotate, setRotate] = React.useState(initial.rotate);
  const [aspect, setAspect] = React.useState<number | null>(initial.aspect);
  const [zoom, setZoom] = React.useState(1); // 1 = full frame, 2 = half size
  const [center, setCenter] = React.useState({ x: 0.5, y: 0.5 });
  const [natural, setNatural] = React.useState<{ w: number; h: number } | null>(null);
  const stageRef = React.useRef<HTMLDivElement>(null);
  const drag = React.useRef<{ x: number; y: number; cx: number; cy: number } | null>(null);

  React.useEffect(() => {
    if (open) { setRotate(initial.rotate); setAspect(initial.aspect); setZoom(1); setCenter({ x: 0.5, y: 0.5 }); }
  }, [open, initial]);

  const rotatedDims = natural ? (rotate % 180 === 0 ? natural : { w: natural.h, h: natural.w }) : null;
  const frame = React.useMemo(() => {
    if (!rotatedDims) return null;
    const imgAspect = rotatedDims.w / rotatedDims.h;
    let w: number, h: number;
    if (aspect == null) { w = 1 / zoom; h = 1 / zoom; }
    else if (aspect >= imgAspect) { w = 1 / zoom; h = (w * imgAspect) / aspect; }
    else { h = 1 / zoom; w = (h * aspect) / imgAspect; }
    const x = Math.min(1 - w, Math.max(0, center.x - w / 2));
    const y = Math.min(1 - h, Math.max(0, center.y - h / 2));
    return { x, y, w, h };
  }, [rotatedDims, aspect, zoom, center]);

  const onPointerDown = (e: React.PointerEvent) => {
    drag.current = { x: e.clientX, y: e.clientY, cx: center.x, cy: center.y };
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };
  const onPointerMove = (e: React.PointerEvent) => {
    if (!drag.current || !stageRef.current) return;
    const rect = stageRef.current.getBoundingClientRect();
    setCenter({ x: drag.current.cx + (e.clientX - drag.current.x) / rect.width, y: drag.current.cy + (e.clientY - drag.current.y) / rect.height });
  };
  const onPointerUp = () => { drag.current = null; };
  const onKey = (e: React.KeyboardEvent) => {
    const d = 0.02;
    if (e.key === "ArrowLeft") setCenter((c) => ({ ...c, x: c.x - d }));
    if (e.key === "ArrowRight") setCenter((c) => ({ ...c, x: c.x + d }));
    if (e.key === "ArrowUp") setCenter((c) => ({ ...c, y: c.y - d }));
    if (e.key === "ArrowDown") setCenter((c) => ({ ...c, y: c.y + d }));
  };

  const apply = () => {
    const isIdentity = aspect == null && zoom === 1;
    onApply({ rotate: ((rotate % 360) + 360) % 360, crop: isIdentity || !frame ? null : frame, aspect });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>עריכת תמונה</DialogTitle>
          <DialogDescription>סובבו את התמונה ובחרו יחס חיתוך. גררו את המסגרת (או השתמשו בחצי המקלדת) כדי למקם אותה.</DialogDescription>
        </DialogHeader>
        <div ref={stageRef} className="relative mx-auto flex max-h-[55vh] w-full items-center justify-center overflow-hidden rounded-md bg-brand-dark" style={{ aspectRatio: rotatedDims ? `${rotatedDims.w} / ${rotatedDims.h}` : "4 / 3" }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={src} alt="תצוגה מקדימה לעריכה" onLoad={(e) => setNatural({ w: e.currentTarget.naturalWidth, h: e.currentTarget.naturalHeight })} className="pointer-events-none max-h-full max-w-full select-none" style={{ transform: `rotate(${rotate}deg)`, transformOrigin: "center", ...(rotate % 180 !== 0 && rotatedDims ? { width: `${(rotatedDims.h / rotatedDims.w) * 100}%`, height: "auto", maxWidth: "none" } : { width: "100%", height: "100%", objectFit: "contain" }) }} />
          {frame && (
            <div role="slider" tabIndex={0} aria-label="מסגרת חיתוך – גררו או השתמשו בחצים" aria-valuenow={Math.round(center.x * 100)} onKeyDown={onKey} onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={onPointerUp}
              className={cn("absolute cursor-move border-2 border-white shadow-[0_0_0_9999px_rgba(24,56,59,0.55)] focus-visible:outline-2 focus-visible:outline-brand-amber", aspect == null && zoom === 1 && "opacity-0")}
              style={{ left: `${frame.x * 100}%`, top: `${frame.y * 100}%`, width: `${frame.w * 100}%`, height: `${frame.h * 100}%` }} />
          )}
        </div>
        <div className="grid gap-4 sm:grid-cols-[auto_1fr] sm:items-center">
          <div className="flex items-center gap-2">
            <Button type="button" variant="outline" size="icon" onClick={() => setRotate((r) => r - 90)} aria-label="סיבוב שמאלה"><RotateCcw aria-hidden /></Button>
            <Button type="button" variant="outline" size="icon" onClick={() => setRotate((r) => r + 90)} aria-label="סיבוב ימינה"><RotateCw aria-hidden /></Button>
            <div className="ms-2 flex gap-1" role="group" aria-label="יחס חיתוך">
              {ASPECTS.map((a) => <Button key={a.label} type="button" size="sm" variant={aspect === a.value ? "secondary" : "ghost"} aria-pressed={aspect === a.value} onClick={() => { setAspect(a.value); if (a.value != null && zoom === 1) setZoom(1.0001); }}>{a.label}</Button>)}
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Label htmlFor="zoom" className="whitespace-nowrap">גודל מסגרת</Label>
            <input id="zoom" type="range" min={1} max={3} step={0.05} value={zoom} onChange={(e) => setZoom(Number(e.target.value))} className="w-full accent-[#16454A]" />
          </div>
        </div>
        <DialogFooter>
          <Button type="button" onClick={apply}>החלת השינויים</Button>
          <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>ביטול</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
