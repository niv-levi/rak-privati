import Link from "next/link";
import { Scale } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { formatDate } from "@/lib/format";

export type Section = { id: string; title: string; body: React.ReactNode };

/** Long-form content page: heading, draft notice, table of contents, prose sections. */
export function LegalPage({ title, description, version, updatedAt, sections, draft = true, children }: { title: string; description?: string; version?: string; updatedAt: string; sections: Section[]; draft?: boolean; children?: React.ReactNode }) {
  return (
    <div className="container-page pb-16">
      <div className="py-8 sm:py-10">
        <h1 className="text-h1 font-extrabold">{title}</h1>
        {description && <p className="mt-2 max-w-3xl text-muted-foreground leading-relaxed">{description}</p>}
        <p className="mt-2 text-xs text-muted-foreground">{version && <>גרסה <span className="num">{version}</span> · </>}עודכן לאחרונה: <span className="num">{formatDate(updatedAt)}</span></p>
      </div>
      {draft && (
        <Alert variant="warning" className="mb-8">
          <AlertTitle className="flex items-center gap-2"><Scale className="size-4" aria-hidden /> טיוטה לבדיקה משפטית</AlertTitle>
          <AlertDescription>מסמך זה הוא טיוטה מקצועית שנכתבה לצורכי השקה וטרם אושרה על ידי עורך/ת דין. הוא אינו ייעוץ משפטי. לפני השקה מסחרית יש להעבירו לבדיקת יועץ משפטי המתמחה בדין הישראלי (ראו docs/LEGAL_REVIEW_CHECKLIST.md).</AlertDescription>
        </Alert>
      )}
      <div className="grid gap-10 lg:grid-cols-[240px_1fr]">
        <nav aria-label="תוכן העניינים" className="lg:sticky lg:top-24 lg:self-start">
          <p className="mb-2 text-sm font-bold">תוכן העניינים</p>
          <ol className="space-y-1 text-sm">{sections.map((s, i) => <li key={s.id}><a href={`#${s.id}`} className="text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"><span className="num">{i + 1}.</span> {s.title}</a></li>)}</ol>
        </nav>
        <article className="prose-rp max-w-3xl space-y-10">
          {children}
          {sections.map((s, i) => (
            <section key={s.id} id={s.id} aria-labelledby={`${s.id}-h`} className="scroll-mt-24 space-y-3">
              <h2 id={`${s.id}-h`} className="text-h3 font-bold"><span className="num text-primary">{i + 1}.</span> {s.title}</h2>
              <div className="space-y-3 text-[15px] leading-relaxed text-foreground/90 [&_ul]:list-disc [&_ul]:space-y-1 [&_ul]:ps-5 [&_ol]:list-decimal [&_ol]:space-y-1 [&_ol]:ps-5 [&_a]:underline [&_a]:underline-offset-4 [&_strong]:text-brand-dark">{s.body}</div>
            </section>
          ))}
          <p className="border-t border-border pt-6 text-sm text-muted-foreground">שאלות על מסמך זה? <Link href="/contact" className="underline underline-offset-4">צרו קשר</Link>.</p>
        </article>
      </div>
    </div>
  );
}
