import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { AlertTriangle, CheckCircle2, Info, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";

const alertVariants = cva("relative w-full rounded-md border p-4 text-sm flex gap-3 [&_svg]:size-5 [&_svg]:shrink-0 [&_svg]:mt-0.5", {
  variants: {
    variant: {
      default: "bg-card border-border text-foreground [&_svg]:text-primary",
      info: "bg-primary-soft border-primary/20 text-brand-dark [&_svg]:text-primary",
      success: "bg-success-soft border-success/30 text-brand-dark [&_svg]:text-success",
      warning: "bg-warning-soft border-warning/30 text-brand-dark [&_svg]:text-warning",
      destructive: "bg-destructive-soft border-destructive/30 text-brand-dark [&_svg]:text-destructive",
    },
  },
  defaultVariants: { variant: "default" },
});

const icons = { default: Info, info: Info, success: CheckCircle2, warning: AlertTriangle, destructive: XCircle };

const Alert = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement> & VariantProps<typeof alertVariants> & { icon?: React.ReactNode }>(
  ({ className, variant = "default", icon, children, ...props }, ref) => {
    const Icon = icons[variant ?? "default"];
    return (
      <div ref={ref} role={variant === "destructive" ? "alert" : "status"} className={cn(alertVariants({ variant }), className)} {...props}>
        {icon ?? <Icon aria-hidden />}
        <div className="flex-1 space-y-1">{children}</div>
      </div>
    );
  }
);
Alert.displayName = "Alert";

const AlertTitle = ({ className, ...props }: React.HTMLAttributes<HTMLParagraphElement>) => (
  <p className={cn("font-bold leading-none", className)} {...props} />
);
const AlertDescription = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn("text-sm leading-relaxed [&_p]:leading-relaxed", className)} {...props} />
);

export { Alert, AlertTitle, AlertDescription };
