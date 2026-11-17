import type { Metadata, Viewport } from "next";
import { heebo } from "@/lib/fonts";
import { siteConfig } from "@/lib/config/site";
import { ToastProvider } from "@/components/ui/toast";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Direction } from "radix-ui";
import { ServiceWorkerRegister } from "@/components/shared/sw-register";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(siteConfig.url),
  title: { default: `${siteConfig.name} – ${siteConfig.tagline}`, template: `%s | ${siteConfig.name}` },
  description: siteConfig.description,
  applicationName: siteConfig.name,
  appleWebApp: { capable: true, title: siteConfig.name, statusBarStyle: "default" },
  openGraph: { type: "website", locale: "he_IL", siteName: siteConfig.name, title: `${siteConfig.name} – ${siteConfig.tagline}`, description: siteConfig.description },
  twitter: { card: "summary_large_image" },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  themeColor: "#16454A",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="he" dir="rtl" className={`${heebo.variable} h-full`}>
      <body className="flex min-h-full flex-col">
        <Direction.Provider dir="rtl">
          <TooltipProvider delayDuration={200}>
            <ToastProvider>{children}</ToastProvider>
            <ServiceWorkerRegister />
          </TooltipProvider>
        </Direction.Provider>
      </body>
    </html>
  );
}
