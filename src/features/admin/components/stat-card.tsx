import Link from "next/link";
import { cn } from "@/lib/utils";

export function StatCard({ label, value, href, tone = "default", hint }: { label: string; value: number | string; href?: string; tone?: "default" | "warning" | "danger" | "success"; hint?: string }) {
  const inner = (
    <div className={cn("rounded-lg border bg-card p-4 shadow-card", tone === "warning" && "border-warning/40", tone === "danger" && "border-destructive/40", tone === "success" && "border-success/40", tone === "default" && "border-border")}>
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="mt-1 text-3xl font-extrabold num">{value}</p>
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
  return href ? <Link href={href} className="block rounded-lg focus-visible:outline-2 focus-visible:outline-ring">{inner}</Link> : inner;
}
