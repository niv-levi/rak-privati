import type { Metadata } from "next";
import { ComparePageClient } from "@/features/listings/components/compare-page";

export const metadata: Metadata = { title: "השוואת רכבים", robots: { index: false } };

export default function ComparePage() {
  return <ComparePageClient />;
}
