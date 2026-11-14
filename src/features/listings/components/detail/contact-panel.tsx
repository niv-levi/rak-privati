"use client";
import * as React from "react";
import Link from "next/link";
import { MessageCircle, Phone, ShieldCheck, Clock, Loader2 } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { formatIsraeliPhone } from "@/lib/format";
import { revealContactAction, type RevealedContact } from "@/features/listings/actions";

export function ContactPanel({ listingId, phoneOptIn, whatsappOptIn, contactHours, loggedIn, isOwner, preview, vehicleTitle }: { listingId: string; phoneOptIn: boolean; whatsappOptIn: boolean; contactHours: string | null; loggedIn: boolean; isOwner: boolean; preview?: boolean; vehicleTitle: string }) {
  const [revealed, setRevealed] = React.useState<RevealedContact | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [pendingChannel, setPendingChannel] = React.useState<"phone" | "whatsapp" | null>(null);

  const reveal = (channel: "phone" | "whatsapp") => {
    if (preview) return;
    setPendingChannel(channel);
    setError(null);
    revealContactAction(listingId, channel).then((r) => {
      setPendingChannel(null);
      if (r.ok) setRevealed(r.data);
      else setError(r.error);
    });
  };

  if (!phoneOptIn && !whatsappOptIn) return <p className="text-sm text-muted-foreground">המוכר לא אישר עדיין ערוץ ליצירת קשר.</p>;

  if (!loggedIn && !preview) {
    return (
      <div className="space-y-3">
        <p className="text-sm text-muted-foreground">כדי לראות את פרטי הקשר של המוכר יש להתחבר עם מספר טלפון. כך אנחנו שומרים על המוכרים מפני ספאם וסוחרים.</p>
        <Link href={`/login?next=/cars/${listingId}`} className={buttonVariants({ size: "lg", className: "w-full" })}><Phone aria-hidden /> התחברות להצגת הטלפון</Link>
      </div>
    );
  }

  const phoneDisplay = revealed ? formatIsraeliPhone(revealed.phone_e164) : null;
  const waNumber = revealed ? revealed.phone_e164.replace("+", "") : null;
  const waText = encodeURIComponent(`שלום, ראיתי את המודעה שלך ברק פרטי (${vehicleTitle}) ואשמח לשמוע פרטים נוספים.`);

  return (
    <div className="space-y-3">
      {contactHours && <p className="flex items-center gap-2 text-sm text-muted-foreground"><Clock className="size-4" aria-hidden /> שעות נוחות ליצירת קשר: {contactHours}</p>}
      {revealed ? (
        <div className="space-y-2 rounded-md bg-secondary p-3" role="status">
          <p className="text-sm">המוכר: <strong>{revealed.display_name ?? "מוכר פרטי"}</strong></p>
          {phoneOptIn && <a href={`tel:${revealed.phone_e164}`} className={buttonVariants({ size: "lg", className: "w-full" })}><Phone aria-hidden /> <span className="num">{phoneDisplay}</span></a>}
          {whatsappOptIn && <a href={`https://wa.me/${waNumber}?text=${waText}`} target="_blank" rel="noopener noreferrer" className={buttonVariants({ size: "lg", variant: "outline", className: "w-full" })}><MessageCircle aria-hidden /> שליחת הודעת WhatsApp</a>}
        </div>
      ) : (
        <div className="space-y-2">
          {phoneOptIn && (
            <Button size="lg" className="w-full" onClick={() => reveal("phone")} disabled={!!pendingChannel || isOwner}>
              {pendingChannel === "phone" ? <Loader2 className="animate-spin" aria-hidden /> : <Phone aria-hidden />} הצגת מספר טלפון
            </Button>
          )}
          {whatsappOptIn && (
            <Button size="lg" variant="outline" className="w-full" onClick={() => reveal("whatsapp")} disabled={!!pendingChannel || isOwner}>
              {pendingChannel === "whatsapp" ? <Loader2 className="animate-spin" aria-hidden /> : <MessageCircle aria-hidden />} פנייה ב-WhatsApp
            </Button>
          )}
          {isOwner && <p className="text-xs text-muted-foreground">זו המודעה שלך – כך קונים יראו את כפתורי הקשר.</p>}
        </div>
      )}
      {error && (
        <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert>
      )}
      <p className="flex items-start gap-2 text-xs text-muted-foreground"><ShieldCheck className="size-4 shrink-0 text-success" aria-hidden /> המספר נחשף רק למשתמשים מחוברים ולאחר לחיצה מכוונת. אנחנו מתעדים כל חשיפה כדי להגן על המוכרים.</p>
    </div>
  );
}
