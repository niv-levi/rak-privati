import { cn } from "@/lib/utils";

type SymbolProps = { className?: string; variant?: "default" | "on-dark" | "mono"; title?: string };

/** Inline SVG symbol: a road bending into a check mark with an amber waypoint. */
export function LogoSymbol({ className, variant = "default", title }: SymbolProps) {
  const bg = variant === "on-dark" ? "#FFFFFF" : variant === "mono" ? "currentColor" : "#16454A";
  const fg = variant === "on-dark" ? "#16454A" : "#FFFFFF";
  const accent = variant === "mono" ? fg : "#C48A45";
  return (
    <svg viewBox="0 0 64 64" className={cn("shrink-0", className)} role={title ? "img" : undefined} aria-hidden={title ? undefined : true} aria-label={title}>
      <rect width="64" height="64" rx="16" fill={bg} />
      <path d="M15 35.5 C21 35.5 25.5 41 29 46.5 L48 17" fill="none" stroke={fg} strokeWidth="8.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M33.5 40 L37 34.5 M40 29.5 L43.5 24" fill="none" stroke={bg === "currentColor" ? "#18383B" : bg} strokeWidth="2" strokeLinecap="round" />
      <circle cx="50.5" cy="13.5" r="3.6" fill={accent} />
    </svg>
  );
}

/** Horizontal lockup: symbol + Hebrew wordmark rendered as text (RTL, Heebo). */
export function Logo({ className, variant = "default", size = "md" }: { className?: string; variant?: "default" | "on-dark"; size?: "sm" | "md" | "lg" }) {
  const sizes = { sm: { icon: "size-7", text: "text-lg" }, md: { icon: "size-9", text: "text-xl" }, lg: { icon: "size-12", text: "text-3xl" } }[size];
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <LogoSymbol className={sizes.icon} variant={variant} />
      <span className={cn("font-extrabold tracking-tight leading-none", sizes.text, variant === "on-dark" ? "text-white" : "text-brand-dark")} dir="rtl">
        רק פרטי
      </span>
    </span>
  );
}
