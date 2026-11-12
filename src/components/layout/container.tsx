import { cn } from "@/lib/utils";

export function Container({ className, children, as: Tag = "div" }: { className?: string; children: React.ReactNode; as?: "div" | "section" | "main" | "nav" | "header" | "footer" }) {
  return <Tag className={cn("container-page", className)}>{children}</Tag>;
}
