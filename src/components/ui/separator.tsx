import * as React from "react";
import { cn } from "@/lib/utils";

const Separator = React.forwardRef<HTMLHRElement, React.HTMLAttributes<HTMLHRElement> & { orientation?: "horizontal" | "vertical"; decorative?: boolean }>(
  ({ className, orientation = "horizontal", decorative = true, ...props }, ref) => (
    <hr
      ref={ref}
      aria-hidden={decorative || undefined}
      aria-orientation={orientation === "vertical" ? "vertical" : undefined}
      className={cn("shrink-0 border-0 bg-border", orientation === "horizontal" ? "h-px w-full" : "h-full w-px", className)}
      {...props}
    />
  )
);
Separator.displayName = "Separator";

export { Separator };
