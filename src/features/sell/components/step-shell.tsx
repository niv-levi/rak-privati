import { ArrowLeft, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";

export function StepShell({ title, description, children, onBack, onNext, nextLabel = "המשך", pending, nextDisabled, hideNext, extra }: { title: string; description?: React.ReactNode; children: React.ReactNode; onBack?: () => void; onNext?: () => void; nextLabel?: string; pending?: boolean; nextDisabled?: boolean; hideNext?: boolean; extra?: React.ReactNode }) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-h2 font-extrabold">{title}</h2>
        {description && <div className="mt-1 text-sm text-muted-foreground leading-relaxed">{description}</div>}
      </div>
      {children}
      <div className="flex flex-col-reverse gap-3 border-t border-border pt-5 sm:flex-row sm:items-center sm:justify-between">
        <div>{onBack && <Button type="button" variant="ghost" onClick={onBack}><ArrowRight aria-hidden /> חזרה</Button>}</div>
        <div className="flex items-center gap-3">
          {extra}
          {!hideNext && (
            <Button type={onNext ? "button" : "submit"} size="lg" onClick={onNext} disabled={pending || nextDisabled}>
              {pending ? <Spinner label="שומר" /> : <>{nextLabel} <ArrowLeft aria-hidden /></>}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

export function FormError({ message }: { message?: string | null }) {
  if (!message) return null;
  return <p role="alert" className="rounded-md bg-destructive-soft px-3 py-2 text-sm font-semibold text-destructive">{message}</p>;
}
