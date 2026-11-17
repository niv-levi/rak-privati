import type { NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/proxy";

export async function proxy(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  matcher: [
    /*
     * Run on all paths except static assets, images, fonts, icons, manifest and the service worker.
     */
    "/((?!_next/static|_next/image|fonts/|icons/|brand/|sw\\.js|manifest\\.webmanifest|offline|robots\\.txt|sitemap\\.xml|favicon\\.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|avif|woff2?)$).*)",
  ],
};
