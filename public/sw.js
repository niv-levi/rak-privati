/* רק פרטי – service worker.
 * Strategy: precache the offline page + static brand assets; network-first for navigations
 * with offline fallback; cache-first for hashed static assets. Account, admin, API, auth and
 * vehicle-report pages are NEVER cached (they may contain private data). */
const VERSION = "rp-v1";
const STATIC_CACHE = `${VERSION}-static`;
const PRECACHE = ["/offline", "/icons/icon-192.png", "/icons/icon-512.png", "/brand/symbol.svg"];
const NEVER_CACHE = [/^\/account/, /^\/admin/, /^\/api\//, /^\/login/, /^\/verify/, /^\/vehicle-check/, /^\/compare/];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(STATIC_CACHE).then((c) => c.addAll(PRECACHE)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((k) => !k.startsWith(VERSION)).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  if (NEVER_CACHE.some((r) => r.test(url.pathname))) return;

  if (req.mode === "navigate") {
    event.respondWith(fetch(req).catch(() => caches.match("/offline").then((r) => r || Response.error())));
    return;
  }
  if (url.pathname.startsWith("/_next/static/") || url.pathname.startsWith("/fonts/") || url.pathname.startsWith("/icons/") || url.pathname.startsWith("/brand/")) {
    event.respondWith(caches.match(req).then((hit) => hit || fetch(req).then((res) => { if (res.ok) { const copy = res.clone(); caches.open(STATIC_CACHE).then((c) => c.put(req, copy)); } return res; })));
  }
});

/* Push notifications architecture: requires VAPID keys + subscription storage (not configured). */
self.addEventListener("push", (event) => {
  if (!event.data) return;
  let payload = {};
  try { payload = event.data.json(); } catch { payload = { title: "רק פרטי", body: event.data.text() }; }
  event.waitUntil(self.registration.showNotification(payload.title || "רק פרטי", { body: payload.body || "", icon: "/icons/icon-192.png", dir: "rtl", lang: "he", data: { url: payload.url || "/account/notifications" } }));
});
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  event.waitUntil(self.clients.openWindow(event.notification.data?.url || "/"));
});
