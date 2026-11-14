"use client";
import * as React from "react";
import Image from "next/image";
import { ImagePlus, Trash2, Star, ArrowRight, ArrowLeft, Pencil, Upload, AlertCircle, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/components/ui/toast";
import { cn } from "@/lib/utils";
import { ImageEditor, type EditState } from "./image-editor";

export type UploadedImage = { id: string; url: string | null; storage_path: string; sort_order: number; is_cover: boolean; alt_text: string | null };
type Pending = { localId: string; file: File; previewUrl: string; progress: number; status: "ready" | "uploading" | "error"; error?: string; edit: EditState };

const ACCEPT = ".jpg,.jpeg,.png,.webp,.heic,.heif,.avif,image/jpeg,image/png,image/webp,image/heic,image/heif,image/avif";
const MAX_BYTES = 12 * 1024 * 1024;
const MAX_IMAGES = 15;
const MIN_IMAGES = 3;

export function ImageUploader({ listingId, initial, onChange }: { listingId: string; initial: UploadedImage[]; onChange?: (count: number) => void }) {
  const [images, setImages] = React.useState<UploadedImage[]>(initial);
  const [queue, setQueue] = React.useState<Pending[]>([]);
  const [dragOver, setDragOver] = React.useState(false);
  const [editing, setEditing] = React.useState<Pending | null>(null);
  const inputRef = React.useRef<HTMLInputElement>(null);
  const { push } = useToast();
  const liveRef = React.useRef<HTMLParagraphElement>(null);

  React.useEffect(() => onChange?.(images.length), [images.length, onChange]);
  React.useEffect(() => () => queue.forEach((q) => URL.revokeObjectURL(q.previewUrl)), []); // eslint-disable-line react-hooks/exhaustive-deps

  const announce = (msg: string) => { if (liveRef.current) liveRef.current.textContent = msg; };

  const addFiles = (files: FileList | File[]) => {
    const room = MAX_IMAGES - images.length - queue.length;
    const list = Array.from(files).slice(0, Math.max(0, room));
    if (Array.from(files).length > room) push({ kind: "error", title: `ניתן להעלות עד ${MAX_IMAGES} תמונות` });
    const next: Pending[] = [];
    for (const file of list) {
      if (file.size > MAX_BYTES) { push({ kind: "error", title: `${file.name}: הקובץ גדול מ-12MB` }); continue; }
      if (!/\.(jpe?g|png|webp|heic|heif|avif)$/i.test(file.name) && !/^image\/(jpeg|png|webp|heic|heif|avif)$/.test(file.type)) { push({ kind: "error", title: `${file.name}: סוג קובץ לא נתמך` }); continue; }
      next.push({ localId: crypto.randomUUID(), file, previewUrl: URL.createObjectURL(file), progress: 0, status: "ready", edit: { rotate: 0, crop: null, aspect: null } });
    }
    setQueue((q) => [...q, ...next]);
    if (next.length) announce(`${next.length} קבצים נוספו לתור ההעלאה`);
  };

  const upload = (p: Pending) =>
    new Promise<void>((resolve) => {
      setQueue((q) => q.map((x) => (x.localId === p.localId ? { ...x, status: "uploading", progress: 0, error: undefined } : x)));
      const fd = new FormData();
      fd.append("file", p.file);
      fd.append("rotate", String(p.edit.rotate));
      if (p.edit.crop) fd.append("crop", JSON.stringify(p.edit.crop));
      const xhr = new XMLHttpRequest();
      xhr.open("POST", `/api/listings/${listingId}/images`);
      xhr.upload.onprogress = (e) => { if (e.lengthComputable) setQueue((q) => q.map((x) => (x.localId === p.localId ? { ...x, progress: Math.round((e.loaded / e.total) * 90) } : x))); };
      xhr.onload = () => {
        try {
          const body = JSON.parse(xhr.responseText) as { image?: UploadedImage; error?: string };
          if (xhr.status === 201 && body.image) {
            setImages((imgs) => [...imgs, body.image!]);
            setQueue((q) => q.filter((x) => x.localId !== p.localId));
            URL.revokeObjectURL(p.previewUrl);
            announce("התמונה הועלתה");
          } else {
            setQueue((q) => q.map((x) => (x.localId === p.localId ? { ...x, status: "error", error: body.error ?? "העלאה נכשלה" } : x)));
          }
        } catch {
          setQueue((q) => q.map((x) => (x.localId === p.localId ? { ...x, status: "error", error: "העלאה נכשלה" } : x)));
        }
        resolve();
      };
      xhr.onerror = () => { setQueue((q) => q.map((x) => (x.localId === p.localId ? { ...x, status: "error", error: "בעיית רשת בהעלאה" } : x))); resolve(); };
      xhr.send(fd);
    });

  const uploadAll = async () => { for (const p of queue.filter((q) => q.status !== "uploading")) await upload(p); };

  const patch = async (body: Record<string, unknown>) => {
    const res = await fetch(`/api/listings/${listingId}/images`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
    if (!res.ok) push({ kind: "error", title: "העדכון נכשל" });
    return res.ok;
  };
  const setCover = async (id: string) => { if (await patch({ cover: id })) setImages((imgs) => imgs.map((i) => ({ ...i, is_cover: i.id === id }))); };
  const move = async (id: string, dir: -1 | 1) => {
    const idx = images.findIndex((i) => i.id === id);
    const j = idx + dir;
    if (j < 0 || j >= images.length) return;
    const next = [...images];
    [next[idx], next[j]] = [next[j]!, next[idx]!];
    setImages(next);
    await patch({ order: next.map((i) => i.id) });
  };
  const remove = async (id: string) => {
    const res = await fetch(`/api/listings/${listingId}/images/${id}`, { method: "DELETE" });
    if (res.ok) { setImages((imgs) => { const rest = imgs.filter((i) => i.id !== id); if (!rest.some((i) => i.is_cover) && rest[0]) rest[0] = { ...rest[0], is_cover: true }; return rest; }); announce("התמונה נמחקה"); }
    else push({ kind: "error", title: "לא ניתן למחוק את התמונה" });
  };
  const saveAlt = async (id: string, text: string) => { await patch({ alt: { id, text } }); };

  return (
    <div className="space-y-6">
      <p ref={liveRef} className="sr-only" aria-live="polite" />
      <div
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => { e.preventDefault(); setDragOver(false); addFiles(e.dataTransfer.files); }}
        className={cn("flex flex-col items-center justify-center gap-3 rounded-lg border-2 border-dashed p-8 text-center transition-colors", dragOver ? "border-primary bg-primary-soft" : "border-border bg-card")}
      >
        <ImagePlus className="size-10 text-primary" aria-hidden />
        <div>
          <p className="font-semibold">גררו לכאן תמונות או</p>
          <Button type="button" variant="outline" className="mt-2" onClick={() => inputRef.current?.click()}>בחירת קבצים</Button>
          <input ref={inputRef} type="file" accept={ACCEPT} multiple className="sr-only" aria-label="בחירת תמונות להעלאה" onChange={(e) => { if (e.target.files) addFiles(e.target.files); e.target.value = ""; }} />
        </div>
        <p className="text-xs text-muted-foreground">{MIN_IMAGES}–{MAX_IMAGES} תמונות · JPG, PNG, WebP, HEIC · עד 12MB לקובץ · נתוני מיקום (EXIF) מוסרים אוטומטית</p>
      </div>

      {queue.length > 0 && (
        <section aria-label="תור העלאה" className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-bold">ממתינות להעלאה ({queue.length})</h3>
            <Button type="button" onClick={uploadAll} disabled={queue.every((q) => q.status === "uploading")}><Upload aria-hidden /> העלאת הכול</Button>
          </div>
          <ul className="grid gap-3 sm:grid-cols-2">
            {queue.map((p) => (
              <li key={p.localId} className="flex gap-3 rounded-md border border-border bg-card p-3">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={p.previewUrl} alt="" className="size-20 shrink-0 rounded-sm object-cover" style={{ transform: `rotate(${p.edit.rotate}deg)` }} />
                <div className="min-w-0 flex-1 space-y-2">
                  <p className="truncate text-sm font-semibold" dir="ltr">{p.file.name}</p>
                  {p.status === "uploading" && <Progress value={p.progress} label={`התקדמות העלאה ${p.file.name}`} />}
                  {p.status === "error" && <p className="flex items-center gap-1 text-xs font-semibold text-destructive" role="alert"><AlertCircle className="size-3.5" aria-hidden /> {p.error}</p>}
                  <div className="flex flex-wrap gap-1">
                    <Button type="button" size="sm" variant="outline" onClick={() => setEditing(p)} disabled={p.status === "uploading"}><Pencil aria-hidden /> עריכה</Button>
                    <Button type="button" size="sm" onClick={() => upload(p)} disabled={p.status === "uploading"}><Upload aria-hidden /> העלאה</Button>
                    <Button type="button" size="sm" variant="ghost" onClick={() => setQueue((q) => q.filter((x) => x.localId !== p.localId))} disabled={p.status === "uploading"} aria-label="הסרה מהתור"><Trash2 aria-hidden /></Button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section aria-label="תמונות שהועלו" className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-bold">תמונות במודעה ({images.length}/{MAX_IMAGES})</h3>
          {images.length >= MIN_IMAGES ? <span className="flex items-center gap-1 text-sm text-success"><CheckCircle2 className="size-4" aria-hidden /> מספיק תמונות</span> : <span className="text-sm text-muted-foreground">נדרשות עוד {MIN_IMAGES - images.length}</span>}
        </div>
        {images.length === 0 ? (
          <p className="text-sm text-muted-foreground">עדיין לא הועלו תמונות. תמונה ראשונה תשמש כתמונת השער.</p>
        ) : (
          <ol className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {images.map((img, i) => (
              <li key={img.id} className={cn("space-y-2 rounded-md border bg-card p-2", img.is_cover ? "border-primary" : "border-border")}>
                <div className="relative aspect-[4/3] overflow-hidden rounded-sm bg-secondary">
                  {img.url ? <Image src={img.url} alt={img.alt_text || `תמונה ${i + 1}`} fill sizes="(max-width: 640px) 100vw, 33vw" className="object-cover" unoptimized /> : null}
                  {img.is_cover && <span className="absolute start-2 top-2 rounded-full bg-primary px-2 py-0.5 text-xs font-bold text-white">תמונת שער</span>}
                  <span className="absolute end-2 top-2 rounded-full bg-brand-dark/70 px-2 py-0.5 text-xs text-white num">{i + 1}</span>
                </div>
                <div className="space-y-1">
                  <Label htmlFor={`alt-${img.id}`} className="text-xs">תיאור לנגישות (לא חובה)</Label>
                  <Input id={`alt-${img.id}`} defaultValue={img.alt_text ?? ""} maxLength={200} placeholder="למשל: חזית הרכב בחניה" className="h-9 text-sm" onBlur={(e) => { if (e.target.value !== (img.alt_text ?? "")) void saveAlt(img.id, e.target.value); }} />
                </div>
                <div className="flex flex-wrap items-center gap-1">
                  <Button type="button" size="sm" variant={img.is_cover ? "secondary" : "ghost"} onClick={() => setCover(img.id)} disabled={img.is_cover} aria-pressed={img.is_cover}><Star aria-hidden className={img.is_cover ? "fill-brand-amber text-brand-amber" : undefined} /> שער</Button>
                  <Button type="button" size="icon-sm" variant="ghost" onClick={() => move(img.id, -1)} disabled={i === 0} aria-label="הזזה אחורה"><ArrowRight aria-hidden /></Button>
                  <Button type="button" size="icon-sm" variant="ghost" onClick={() => move(img.id, 1)} disabled={i === images.length - 1} aria-label="הזזה קדימה"><ArrowLeft aria-hidden /></Button>
                  <Button type="button" size="icon-sm" variant="ghost" className="ms-auto text-destructive" onClick={() => remove(img.id)} aria-label="מחיקת התמונה"><Trash2 aria-hidden /></Button>
                </div>
              </li>
            ))}
          </ol>
        )}
      </section>

      {images.length > 0 && images.length < MIN_IMAGES && (
        <Alert variant="info"><AlertDescription>מודעות עם לפחות {MIN_IMAGES} תמונות (חזית, צד, פנים) זוכות להרבה יותר פניות.</AlertDescription></Alert>
      )}

      {editing && (
        <ImageEditor open={!!editing} onOpenChange={(v) => !v && setEditing(null)} src={editing.previewUrl} initial={editing.edit} onApply={(edit) => setQueue((q) => q.map((x) => (x.localId === editing.localId ? { ...x, edit } : x)))} />
      )}
    </div>
  );
}
