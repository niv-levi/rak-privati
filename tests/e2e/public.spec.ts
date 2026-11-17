import { test, expect } from "@playwright/test";

test.describe("public pages, brand and RTL", () => {
  test("homepage communicates the private-only promise", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("html")).toHaveAttribute("lang", "he");
    await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("רכב קונים מאנשים. לא מסוחרים.");
    await expect(page.getByText("פלטפורמה למכירת רכבים מידיים פרטיות בלבד")).toBeVisible();
    await expect(page.getByRole("link", { name: /פרסום רכב/ }).first()).toBeVisible();
    await expect(page.getByRole("link", { name: /בדיקת רכב לפי מספר רישוי/ }).first()).toBeVisible();
    // No fabricated counters / testimonials
    await expect(page.getByText(/ביקורות|לקוחות מרוצים|אלפי מוכרים/)).toHaveCount(0);
    // Empty marketplace shows an honest empty state (no backend in this environment)
    await expect(page.getByText("הלוח חדש וממתין למוכרים הפרטיים הראשונים")).toBeVisible();
  });

  test("never shows 'verified owner' claims anywhere on the homepage", async ({ page }) => {
    await page.goto("/");
    const text = await page.locator("body").innerText();
    expect(text).not.toMatch(/בעלים מאומת|מוכר פרטי מאומת|Verified owner/);
  });

  test("footer links to all policy pages", async ({ page }) => {
    await page.goto("/");
    const footer = page.getByRole("contentinfo");
    for (const name of ["תנאי שימוש", "מדיניות פרטיות", "מדיניות עוגיות", "הצהרת נגישות", "מדיניות מוכרים פרטיים", "מקורות המידע"]) {
      await expect(footer.getByRole("link", { name, exact: true }).first()).toBeVisible();
    }
  });

  for (const path of ["/cars", "/vehicle-check", "/valuation", "/sell", "/how-it-works", "/about", "/contact", "/help", "/faq", "/accessibility", "/terms", "/privacy", "/cookies", "/private-seller-policy", "/data-sources", "/compare", "/login"]) {
    test(`renders ${path} with a single h1`, async ({ page }) => {
      const res = await page.goto(path);
      expect(res?.status()).toBe(200);
      await expect(page.locator("h1")).toHaveCount(1);
      await expect(page.locator("main#main-content")).toBeVisible();
    });
  }

  test("legal drafts are clearly marked for legal review", async ({ page }) => {
    for (const p of ["/terms", "/privacy", "/cookies"]) {
      await page.goto(p);
      await expect(page.getByText("טיוטה לבדיקה משפטית")).toBeVisible();
    }
  });

  test("accessibility statement does not claim external certification", async ({ page }) => {
    await page.goto("/accessibility");
    await expect(page.getByText(/טרם בוצעה בדיקה חיצונית/)).toBeVisible();
  });

  test("there is no commercial or dealer route", async ({ page }) => {
    for (const p of ["/dealer", "/dealers", "/business", "/sell/dealer", "/cars/dealer-inventory"]) {
      const res = await page.goto(p);
      expect(res?.status()).toBe(404);
    }
  });

  test("unknown listing returns 404 without leaking data", async ({ page }) => {
    const res = await page.goto("/cars/00000000-0000-4000-8000-000000000000");
    expect(res?.status()).toBe(404);
    await expect(page.getByRole("heading", { name: "הדף לא נמצא" })).toBeVisible();
  });
});

test.describe("vehicle check", () => {
  test("validates plate format client-side", async ({ page }) => {
    await page.goto("/vehicle-check");
    await page.getByRole("textbox", { name: "מספר רישוי" }).fill("123");
    await page.getByRole("button", { name: /בדיקת הרכב/ }).click();
    await expect(page.getByText("מספר רישוי ישראלי מכיל 7 או 8 ספרות")).toBeVisible();
  });

  test("states honestly that government sources are not configured", async ({ page }) => {
    await page.goto("/vehicle-check?plate=1234567");
    await expect(page.getByText("מקורות המידע הממשלתיים טרם חוברו בסביבה זו")).toBeVisible();
    await expect(page.getByText("המידע מבוסס על המקורות הזמינים ואינו מהווה בדיקה מכנית, משפטית או אישור שהרכב תקין.")).toBeVisible();
    // Full plate is never echoed in the report header (masked)
    await expect(page.getByText("••-•••-67").first()).toBeVisible();
  });

  test("rejects a malformed plate from the URL", async ({ page }) => {
    await page.goto("/vehicle-check?plate=12");
    await expect(page.getByText("מספר הרישוי אינו תקין")).toBeVisible();
  });
});
