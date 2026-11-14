import Link from "next/link";
import { SearchX } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { Logo } from "@/components/brand/logo";

export default function NotFound() {
  return (
    <main className="container-page flex min-h-[70vh] flex-col items-center justify-center py-16 text-center">
      <Link href="/" className="mb-8"><Logo /></Link>
      <div className="mb-4 flex size-16 items-center justify-center rounded-full bg-secondary text-primary"><SearchX className="size-8" aria-hidden /></div>
      <h1 className="text-h1 font-extrabold">הדף לא נמצא</h1>
      <p className="mt-3 max-w-md text-muted-foreground">ייתכן שהמודעה הוסרה, שהקישור שגוי או שהדף הועבר.</p>
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <Link href="/cars" className={buttonVariants()}>לחיפוש רכב</Link>
        <Link href="/" className={buttonVariants({ variant: "outline" })}>לדף הבית</Link>
      </div>
    </main>
  );
}
