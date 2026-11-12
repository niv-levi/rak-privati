import * as React from "react";
import { cn } from "@/lib/utils";

const Progress = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement> & { value: number; label: string }>(
  ({ className, value, label, ...props }, ref) => (
    <div
      ref={ref}
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(value)}
      aria-label={label}
      className={cn("relative h-2 w-full overflow-hidden rounded-full bg-secondary", className)}
      {...props}
    >
      <div className="h-full bg-primary transition-[width]" style={{ width: `${Math.min(100, Math.max(0, value))}%` }} />
    </div>
  )
);
Progress.displayName = "Progress";

export { Progress };
