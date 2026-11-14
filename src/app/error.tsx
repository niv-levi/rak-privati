"use client";
import { useEffect } from "react";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function ErrorBoundary({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);
  return (
    <main className="container-page flex min-h-[60vh] flex-col items-center justify-center py-16 text-center" dir="rtl">
      <div className="mb-4 flex size-16 items-center justify-center rounded-full bg-destructive-soft text-destructive"><AlertTriangle className="size-8" aria-hidden /></div>
      <h1 className="text-h1 font-extrabold">משהו השתבש</h1>
      <p className="mt-3 max-w-md text-muted-foreground">אירעה שגיאה בלתי צפויה. אפשר לנסות שוב, ואם הבעיה חוזרת – לפנות אלינו דרך עמוד יצירת הקשר.</p>
      {error.digest && <p className="mt-2 text-xs text-muted-foreground num">מזהה שגיאה: {error.digest}</p>}
      <Button className="mt-8" onClick={reset}>נסו שוב</Button>
    </main>
  );
}
