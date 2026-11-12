"use client";
import * as React from "react";
import { CheckCircle2, Info, X, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";

type ToastKind = "success" | "error" | "info";
type Toast = { id: number; kind: ToastKind; title: string; description?: string };

const ToastContext = React.createContext<{ push: (t: Omit<Toast, "id">) => void } | null>(null);

export function useToast() {
  const ctx = React.useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within ToastProvider");
  return ctx;
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = React.useState<Toast[]>([]);
  const push = React.useCallback((t: Omit<Toast, "id">) => {
    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev, { ...t, id }]);
    setTimeout(() => setToasts((prev) => prev.filter((x) => x.id !== id)), 6000);
  }, []);
  const dismiss = (id: number) => setToasts((prev) => prev.filter((x) => x.id !== id));
  return (
    <ToastContext.Provider value={{ push }}>
      {children}
      <div className="pointer-events-none fixed inset-x-0 bottom-4 z-[60] flex flex-col items-center gap-2 px-4 sm:items-end sm:px-6" aria-live="polite" aria-atomic="false">
        {toasts.map((t) => {
          const Icon = t.kind === "success" ? CheckCircle2 : t.kind === "error" ? XCircle : Info;
          return (
            <div
              key={t.id}
              role={t.kind === "error" ? "alert" : "status"}
              className={cn(
                "pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-md border bg-card p-4 shadow-card-hover animate-fade-in",
                t.kind === "success" && "border-success/40",
                t.kind === "error" && "border-destructive/40",
                t.kind === "info" && "border-primary/30"
              )}
            >
              <Icon aria-hidden className={cn("mt-0.5 size-5 shrink-0", t.kind === "success" && "text-success", t.kind === "error" && "text-destructive", t.kind === "info" && "text-primary")} />
              <div className="flex-1 text-sm">
                <p className="font-bold">{t.title}</p>
                {t.description && <p className="text-muted-foreground">{t.description}</p>}
              </div>
              <button type="button" onClick={() => dismiss(t.id)} className="rounded-sm p-1 text-muted-foreground hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring">
                <X className="size-4" aria-hidden />
                <span className="sr-only">סגירת ההודעה</span>
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}
