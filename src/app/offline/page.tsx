import { WifiOff } from "lucide-react";

export const metadata = { title: "אין חיבור לרשת", robots: { index: false } };

export default function OfflinePage() {
  return (
    <main className="container-page flex min-h-[70vh] flex-col items-center justify-center py-16 text-center">
      <div className="mb-4 flex size-16 items-center justify-center rounded-full bg-secondary text-primary"><WifiOff className="size-8" aria-hidden /></div>
      <h1 className="text-h1 font-extrabold">אין חיבור לרשת</h1>
      <p className="mt-3 max-w-md text-muted-foreground">נראה שהמכשיר לא מחובר כרגע לאינטרנט. כשהחיבור יחזור, רעננו את הדף כדי להמשיך.</p>
    </main>
  );
}
