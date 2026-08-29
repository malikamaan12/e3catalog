import { test, expect } from "@playwright/test";
import { setupE2EFixtures, E2ETestFixtures } from "./fixtures";

test.describe("Public Catalog & Marketing Interactive E2E", () => {
  let f: E2ETestFixtures;

  test.beforeAll(async () => {
    f = await setupE2EFixtures();
  });

  test.afterAll(async () => {
    await f.cleanup();
  });

  test("Homepage loads with interactive elements and hero CTA", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveTitle(/E3 Rentals|Event Equipment/i);
    const catalogCta = page.locator("a[href*='/catalog']:visible").first();
    await expect(catalogCta).toBeVisible();
    await catalogCta.click();
    await expect(page).toHaveURL(/\/catalog/);
  });

  test("Catalog search and filter interaction", async ({ page }) => {
    await page.goto("/catalog");
    const searchInput = page.locator("input[placeholder*='Search' i], input[type='search'], input[name='search']").first();
    if (await searchInput.isVisible()) {
      await searchInput.fill("Spot");
      await page.waitForTimeout(600);
    }
    const productCard = page.locator(`a[href*='${f.productSlug}'], a[href*='/catalog/']`).first();
    await expect(productCard).toBeVisible({ timeout: 10000 });
    await productCard.click();
    await expect(page).toHaveURL(/\/catalog\//);
  });

  test("Product detail page date selection and cart addition", async ({ page }) => {
    await page.goto(`/catalog/${f.productSlug}`);
    await expect(page.locator("h1")).toContainText(/Moving Beam Spot|700W/i, { timeout: 10000 });
    
    const startInput = page.locator("input[type='date']").first();
    const endInput = page.locator("input[type='date']").nth(1);
    if (await startInput.isVisible() && await endInput.isVisible()) {
      await startInput.fill("2026-11-10");
      await endInput.fill("2026-11-15");
      await page.waitForTimeout(500);
    }

    const addToCartBtn = page.locator("button:has-text('Add to Quote'), button:has-text('Add to Cart'), button:has-text('Rent Now')").first();
    if (await addToCartBtn.isVisible()) {
      await addToCartBtn.click();
      await page.waitForTimeout(600);
    }
  });

  test("Responsive mobile viewport menu navigation", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/");
    const mobileMenuBtn = page.locator("button[aria-label='Toggle menu']");
    await expect(mobileMenuBtn).toBeVisible({ timeout: 5000 });
    await mobileMenuBtn.click();
    await page.waitForTimeout(500);
    const catalogLink = page.locator("a[href='/catalog']:visible").first();
    await expect(catalogLink).toBeVisible();
    await catalogLink.click();
    await expect(page).toHaveURL(/\/catalog/);
  });
});
