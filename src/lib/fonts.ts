import localFont from "next/font/local";

/**
 * Heebo (variable, 100–900), self-hosted. Hebrew + Latin subsets.
 * No requests to third-party font CDNs at runtime.
 */
export const heebo = localFont({
  src: [
    { path: "../../public/fonts/heebo-hebrew.woff2", style: "normal" },
    { path: "../../public/fonts/heebo-latin.woff2", style: "normal" },
    { path: "../../public/fonts/heebo-latin-ext.woff2", style: "normal" },
  ],
  variable: "--font-heebo",
  display: "swap",
  weight: "100 900",
  fallback: ["system-ui", "Arial", "sans-serif"],
});
