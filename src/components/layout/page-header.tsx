import { cn } from "@/lib/utils";

export function PageHeader({ title, description, eyebrow, actions, className, align = "start" }: { title: string; description?: React.ReactNode; eyebrow?: string; actions?: React.ReactNode; className?: string; align?: "start" | "center" }) {
  return (
    <div className={cn("flex flex-col gap-4 py-8 sm:py-10 md:flex-row md:items-end md:justify-between", align === "center" && "items-center text-center md:flex-col md:items-center", className)}>
      <div className="space-y-2 max-w-3xl">
        {eyebrow && <p className="text-sm font-semibold text-primary">{eyebrow}</p>}
        <h1 className="text-h1 font-extrabold">{title}</h1>
        {description && <p className="text-base text-muted-foreground leading-relaxed">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-3">{actions}</div>}
    </div>
  );
}
