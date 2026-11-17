import { test, expect } from "@playwright/test";

test.describe("server-side protection", () => {
  for (const path of ["/account", "/account/listings", "/account/listings/new", "/account/favorites", "/account/delete", "/admin", "/admin/listings", "/admin/users", "/admin/audit"]) {
    test(`${path} redirects anonymous users to login`, async ({ page }) => {
      await page.goto(path);
      await expect(page).toHaveURL(new RegExp(`/login\\?next=${encodeURIComponent(path).replace(/%2F/g, "(%2F|/)")}`));
    });
  }

  test("image upload API requires authentication", async ({ request }) => {
    const res = await request.post("/api/listings/11111111-1111-4111-8111-111111111111/images", { multipart: { file: { name: "x.jpg", mimeType: "image/jpeg", buffer: Buffer.from([0xff, 0xd8, 0xff]) } } });
    expect(res.status()).toBe(401);
    const del = await request.delete("/api/listings/11111111-1111-4111-8111-111111111111/images/11111111-1111-4111-8111-111111111111");
    expect(del.status()).toBe(401);
  });

  test("cron endpoint rejects requests without the secret", async ({ request }) => {
    const res = await request.get("/api/cron/expire");
    expect(res.status()).toBe(401);
  });

  test("sends security headers", async ({ request }) => {
    const res = await request.get("/");
    const h = res.headers();
    expect(h["x-frame-options"]).toBe("DENY");
    expect(h["x-content-type-options"]).toBe("nosniff");
    expect(h["referrer-policy"]).toBe("strict-origin-when-cross-origin");
    expect(h["content-security-policy"]).toContain("frame-ancestors 'none'");
    expect(h["x-powered-by"]).toBeUndefined();
  });

  test("robots blocks private areas and the sitemap lists only public pages", async ({ request }) => {
    const robots = await (await request.get("/robots.txt")).text();
    for (const p of ["/account", "/admin", "/api"]) expect(robots).toContain(`Disallow: ${p}`);
    const sitemap = await (await request.get("/sitemap.xml")).text();
    expect(sitemap).toContain("/cars");
    expect(sitemap).not.toContain("/account");
    expect(sitemap).not.toContain("/admin");
  });

  test("login and verify pages are not indexable", async ({ page }) => {
    await page.goto("/login");
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", /noindex/);
  });

  test("verify without a pending login goes back to login", async ({ page }) => {
    await page.goto("/verify");
    await expect(page).toHaveURL(/\/login/);
  });

  test("manifest is a valid RTL Hebrew PWA manifest", async ({ request }) => {
    const m = await (await request.get("/manifest.webmanifest")).json();
    expect(m).toMatchObject({ lang: "he", dir: "rtl", display: "standalone", short_name: "רק פרטי" });
    expect(m.icons.some((i: { purpose?: string }) => i.purpose === "maskable")).toBe(true);
  });
});
