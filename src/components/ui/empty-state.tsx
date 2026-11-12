import * as React from "react";
import { cn } from "@/lib/utils";

export function EmptyState({ icon, title, description, action, className }: { icon?: React.ReactNode; title: string; description?: React.ReactNode; action?: React.ReactNode; className?: string }) {
  return (
    <div className={cn("flex flex-col items-center justify-center rounded-lg border border-dashed border-border bg-card/60 px-6 py-12 text-center", className)}>
      {icon && <div className="mb-4 flex size-14 items-center justify-center rounded-full bg-secondary text-primary [&_svg]:size-7">{icon}</div>}
      <h3 className="text-lg font-bold">{title}</h3>
      {description && <div className="mt-2 max-w-md text-sm text-muted-foreground leading-relaxed">{description}</div>}
      {action && <div className="mt-6 flex flex-wrap justify-center gap-3">{action}</div>}
    </div>
  );
}
