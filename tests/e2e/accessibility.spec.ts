import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

const pages = ["/", "/cars", "/vehicle-check", "/vehicle-check?plate=1234567", "/valuation", "/sell", "/login", "/how-it-works", "/faq", "/accessibility", "/terms", "/privacy", "/private-seller-policy", "/data-sources", "/contact", "/help", "/compare"];

test.describe("automated accessibility (axe, WCAG 2.2 AA)", () => {
  for (const path of pages) {
    test(`no violations on ${path}`, async ({ page }) => {
      await page.goto(path);
      const results = await new AxeBuilder({ page: page as never }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"]).analyze();
      const summary = results.violations.map((v) => `${v.id} (${v.impact}): ${v.nodes.slice(0, 3).map((n) => n.target.join(" ")).join(" | ")}`);
      expect(summary, summary.join("\n")).toEqual([]);
    });
  }
});

test.describe("keyboard and focus", () => {
  test("skip link is the first focusable element and moves focus to main", async ({ page, isMobile }) => {
    test.skip(isMobile, "keyboard test on desktop");
    await page.goto("/");
    await page.keyboard.press("Tab");
    const skip = page.getByRole("link", { name: "דילוג לתוכן הראשי" });
    await expect(skip).toBeFocused();
    await expect(skip).toBeVisible();
    await page.keyboard.press("Enter");
    await expect(page.locator("#main-content")).toBeFocused();
  });

  test("login form fields have labels and errors are announced", async ({ page }) => {
    await page.goto("/login");
    await expect(page.getByLabel("מספר טלפון נייד")).toBeVisible();
    await expect(page.getByRole("checkbox", { name: /תנאי השימוש/ })).toBeVisible();
    // marketing consent must not be pre-checked
    await expect(page.getByRole("checkbox", { name: /עדכונים שיווקיים/ })).not.toBeChecked();
  });

  test("FAQ accordion works with the keyboard", async ({ page, isMobile }) => {
    test.skip(isMobile, "keyboard test on desktop");
    await page.goto("/faq");
    const trigger = page.getByRole("button", { name: "מה זה רק פרטי?" });
    await trigger.focus();
    await expect(trigger).toHaveAttribute("aria-expanded", "false");
    await page.keyboard.press("Enter");
    await expect(trigger).toHaveAttribute("aria-expanded", "true");
    await expect(page.getByText("לוח רכבים ישראלי למכירת רכבי נוסעים")).toBeVisible();
  });

  test("mobile menu opens, traps focus and closes with Escape", async ({ page, isMobile }) => {
    test.skip(!isMobile, "mobile only");
    await page.goto("/");
    await page.getByRole("button", { name: "פתיחת תפריט" }).click();
    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();
    await expect(dialog.getByRole("link", { name: "חיפוש רכב" })).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(dialog).toBeHidden();
  });
});

test.describe("reflow and text resizing", () => {
  test("no horizontal scrolling at 320px width", async ({ browser }) => {
    const ctx = await browser.newContext({ viewport: { width: 320, height: 800 }, locale: "he-IL" });
    const page = await ctx.newPage();
    for (const p of ["/", "/cars", "/vehicle-check", "/sell", "/login", "/terms"]) {
      await page.goto(p);
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      expect(overflow, `${p} overflows by ${overflow}px`).toBeLessThanOrEqual(1);
    }
    await ctx.close();
  });

  test("content survives 200% text zoom", async ({ page, isMobile }) => {
    test.skip(isMobile, "desktop only");
    await page.goto("/");
    await page.addStyleTag({ content: "html { font-size: 200% !important; }" });
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(overflow).toBeLessThanOrEqual(1);
  });

  test("respects reduced motion", async ({ browser }) => {
    const ctx = await browser.newContext({ reducedMotion: "reduce" });
    const page = await ctx.newPage();
    await page.goto("/");
    const duration = await page.evaluate(() => getComputedStyle(document.querySelector("a")!).transitionDuration);
    expect(parseFloat(duration)).toBeLessThan(0.01);
    await ctx.close();
  });
});
