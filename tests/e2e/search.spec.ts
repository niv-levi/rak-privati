import { test, expect } from "@playwright/test";

test.describe("marketplace search UI", () => {
  test("filters persist in the URL and chips can clear them", async ({ page, isMobile }) => {
    test.skip(isMobile, "desktop filter sidebar");
    await page.goto("/cars?price_max=90000&year_min=2021&sort=price_asc");
    await expect(page.getByLabel("מיון")).toHaveValue("price_asc");
    const chips = page.getByRole("list", { name: "מסננים פעילים" });
    await expect(chips.getByRole("link", { name: /הסרת המסנן מחיר/ })).toBeVisible();
    await chips.getByRole("link", { name: /הסרת המסנן מחיר/ }).click();
    await expect(page).not.toHaveURL(/price_max/);
    await expect(page).toHaveURL(/year_min=2021/);
  });

  test("empty results suggest widening the search", async ({ page }) => {
    await page.goto("/cars?price_max=10000");
    await expect(page.getByText("לא נמצאו רכבים שמתאימים לסינון")).toBeVisible();
    await expect(page.getByRole("link", { name: "הרחבת מחיר ב-20%" })).toHaveAttribute("href", /price_max=12000/);
  });

  test("changing sort updates the URL", async ({ page, isMobile }) => {
    test.skip(isMobile, "desktop toolbar");
    await page.goto("/cars");
    await page.getByLabel("מיון").selectOption("km_asc");
    await expect(page).toHaveURL(/sort=km_asc/);
  });

  test("save search asks anonymous users to log in", async ({ page }) => {
    await page.goto("/cars?price_max=90000");
    await page.getByRole("button", { name: "שמירת חיפוש" }).click();
    await expect(page.getByRole("dialog")).toContainText("יש להתחבר");
    await expect(page.getByRole("dialog").getByRole("link", { name: "כניסה" })).toHaveAttribute("href", /\/login\?next=/);
  });

  test("hero search builds a filtered URL", async ({ page }) => {
    await page.goto("/");
    await page.getByLabel("מחיר עד").selectOption("90000");
    await page.getByRole("button", { name: "חיפוש", exact: true }).click();
    await expect(page).toHaveURL(/\/cars\?price_max=90000/);
  });

  test("valuation form requires make, model and year", async ({ page }) => {
    await page.goto("/valuation");
    await expect(page.getByRole("button", { name: /חישוב טווח מחיר/ })).toBeDisabled();
    await expect(page.getByText(/מחירי פרסום של מודעות דומות/).first()).toBeVisible();
  });
});
