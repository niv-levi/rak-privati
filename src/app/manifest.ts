import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "רק פרטי – רכב קונים מאנשים. לא מסוחרים.",
    short_name: "רק פרטי",
    description: "לוח רכבים למכירה בין אנשים פרטיים בלבד.",
    lang: "he",
    dir: "rtl",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#F5F5F0",
    theme_color: "#16454A",
    categories: ["shopping", "lifestyle"],
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icons/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    shortcuts: [
      { name: "חיפוש רכב", url: "/cars" },
      { name: "פרסום רכב", url: "/sell" },
      { name: "בדיקת רכב", url: "/vehicle-check" },
    ],
  };
}
