"use client";
import { useEffect } from "react";
import { registerListingViewAction } from "@/features/listings/actions";

export function ViewTracker({ listingId }: { listingId: string }) {
  useEffect(() => {
    const t = setTimeout(() => { void registerListingViewAction(listingId); }, 1500);
    return () => clearTimeout(t);
  }, [listingId]);
  return null;
}
