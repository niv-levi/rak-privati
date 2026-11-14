"use client";
import * as React from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/toast";
import { upsertMakeAction, upsertModelAction, importCatalogCsvAction } from "../actions";
import { bodyStyleLabels, categoryLabels } from "@/lib/labels";

export function CatalogForms({ makes }: { makes: { id: string; name_he: string }[] }) {
  const [pending, start] = React.useTransition();
  const { push } = useToast();
  const router = useRouter();
  const [csv, setCsv] = React.useState("");
  const [make, setMake] = React.useState({ slug: "", name_he: "", name_en: "", is_popular: false });
  const [model, setModel] = React.useState({ make_id: makes[0]?.id ?? "", slug: "", name_he: "", name_en: "", category: "", body_style: "", is_popular: false });
  const done = (r: { ok: boolean; error?: string; message?: string }) => { push(r.ok ? { kind: "success", title: r.message ?? "נשמר" } : { kind: "error", title: r.error ?? "שגיאה" }); if (r.ok) router.refresh(); };
  return (
    <>
      <Card>
        <CardHeader><CardTitle className="text-base">ייבוא CSV</CardTitle><CardDescription>כותרות: make_slug,make_he,make_en,model_slug,model_he,model_en,category,body_style</CardDescription></CardHeader>
        <CardContent className="space-y-2">
          <Textarea aria-label="תוכן CSV" value={csv} onChange={(e) => setCsv(e.target.value)} rows={5} dir="ltr" className="font-mono text-xs" placeholder="make_slug,make_he,make_en,model_slug,model_he,model_en,category,body_style" />
          <Button variant="outline" disabled={pending || !csv.trim()} onClick={() => start(async () => { const r = await importCatalogCsvAction(csv); done(r); if (r.ok) setCsv(""); })}>ייבוא</Button>
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle className="text-base">הוספת יצרן</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          <div className="grid grid-cols-2 gap-2"><div><Label htmlFor="mk-slug">slug</Label><Input id="mk-slug" dir="ltr" value={make.slug} onChange={(e) => setMake({ ...make, slug: e.target.value })} /></div><div><Label htmlFor="mk-he">עברית</Label><Input id="mk-he" value={make.name_he} onChange={(e) => setMake({ ...make, name_he: e.target.value })} /></div><div><Label htmlFor="mk-en">English</Label><Input id="mk-en" dir="ltr" value={make.name_en} onChange={(e) => setMake({ ...make, name_en: e.target.value })} /></div><div className="flex items-end gap-2 pb-2"><Checkbox id="mk-pop" checked={make.is_popular} onCheckedChange={(v) => setMake({ ...make, is_popular: v === true })} /><label htmlFor="mk-pop" className="text-sm">פופולרי</label></div></div>
          <Button variant="outline" disabled={pending} onClick={() => start(async () => done(await upsertMakeAction(make)))}>שמירת יצרן</Button>
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle className="text-base">הוספת דגם</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          <div className="grid grid-cols-2 gap-2">
            <div className="col-span-2"><Label htmlFor="md-make">יצרן</Label><NativeSelect id="md-make" value={model.make_id} onChange={(e) => setModel({ ...model, make_id: e.target.value })}>{makes.map((m) => <option key={m.id} value={m.id}>{m.name_he}</option>)}</NativeSelect></div>
            <div><Label htmlFor="md-slug">slug</Label><Input id="md-slug" dir="ltr" value={model.slug} onChange={(e) => setModel({ ...model, slug: e.target.value })} /></div><div><Label htmlFor="md-he">עברית</Label><Input id="md-he" value={model.name_he} onChange={(e) => setModel({ ...model, name_he: e.target.value })} /></div>
            <div><Label htmlFor="md-en">English</Label><Input id="md-en" dir="ltr" value={model.name_en} onChange={(e) => setModel({ ...model, name_en: e.target.value })} /></div>
            <div><Label htmlFor="md-cat">קטגוריה</Label><NativeSelect id="md-cat" value={model.category} onChange={(e) => setModel({ ...model, category: e.target.value })}><option value="">—</option>{Object.entries(categoryLabels).map(([k, l]) => <option key={k} value={k}>{l}</option>)}</NativeSelect></div>
            <div><Label htmlFor="md-body">מרכב</Label><NativeSelect id="md-body" value={model.body_style} onChange={(e) => setModel({ ...model, body_style: e.target.value })}><option value="">—</option>{Object.entries(bodyStyleLabels).map(([k, l]) => <option key={k} value={k}>{l}</option>)}</NativeSelect></div>
            <div className="flex items-end gap-2 pb-2"><Checkbox id="md-pop" checked={model.is_popular} onCheckedChange={(v) => setModel({ ...model, is_popular: v === true })} /><label htmlFor="md-pop" className="text-sm">פופולרי</label></div>
          </div>
          <Button variant="outline" disabled={pending} onClick={() => start(async () => done(await upsertModelAction({ ...model, category: model.category || undefined, body_style: (model.body_style || undefined) as never })))}>שמירת דגם</Button>
        </CardContent>
      </Card>
    </>
  );
}
