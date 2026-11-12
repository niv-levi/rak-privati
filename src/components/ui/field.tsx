import * as React from "react";
import { Label } from "./label";
import { cn } from "@/lib/utils";

/**
 * Accessible form-field wrapper: label, description, error.
 * Children receive `id`, `aria-describedby`, `aria-invalid` via cloneElement.
 */
export function Field({
  id,
  label,
  description,
  error,
  required,
  optionalLabel = "לא חובה",
  className,
  children,
}: {
  id: string;
  label: React.ReactNode;
  description?: React.ReactNode;
  error?: string;
  required?: boolean;
  optionalLabel?: string;
  className?: string;
  children: React.ReactElement<Record<string, unknown>>;
}) {
  const descId = description ? `${id}-desc` : undefined;
  const errId = error ? `${id}-err` : undefined;
  const describedBy = [descId, errId].filter(Boolean).join(" ") || undefined;
  const child = React.cloneElement(children, {
    id,
    "aria-describedby": describedBy,
    "aria-invalid": error ? true : undefined,
    "aria-required": required || undefined,
  });
  return (
    <div className={cn("space-y-1.5", className)}>
      <div className="flex items-baseline justify-between gap-2">
        <Label htmlFor={id}>{label}</Label>
        {!required && <span className="text-xs text-muted-foreground">{optionalLabel}</span>}
      </div>
      {child}
      {description && (
        <p id={descId} className="text-xs text-muted-foreground leading-relaxed">
          {description}
        </p>
      )}
      {error && (
        <p id={errId} role="alert" className="text-xs font-semibold text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}
