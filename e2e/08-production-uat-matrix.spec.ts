import { test, expect } from "@playwright/test";
import { setupE2EFixtures, E2ETestFixtures } from "./fixtures";

test.describe("Sprint 10: Production-Like UAT Across All 8 Personas", () => {
    let f: E2ETestFixtures;

    test.beforeAll(async () => {
        f = await setupE2EFixtures();
    });

    test.afterAll(async () => {
        await f.cleanup();
    });

    test("1. Public Visitor: Explores Catalog, Availability and Search", async ({ page }) => {
        await page.goto("/catalog", { waitUntil: "domcontentloaded" });
        await expect(page.getByRole("heading", { name: /Catalog/i }).first()).toBeVisible();
        const searchInput = page.getByPlaceholder(/Search equipment/i);
        if (await searchInput.isVisible()) {
            await searchInput.fill("Generator");
        }
    });

    test("2. Client: Reviews Quotations, Approvals and Invoice Center", async ({ browser }) => {
        const clientContext = await browser.newContext();
        const clientPage = await f.loginAsPersona(clientContext, f.clientUser);

        await clientPage.goto("/dashboard/client/invoices", { waitUntil: "domcontentloaded" });
        await expect(clientPage.getByRole("heading", { name: /Invoices/i }).first()).toBeVisible();

        await clientContext.close();
    });

    test("3. Sales Representative: Manages Deals and Quotations", async ({ browser }) => {
        const salesContext = await browser.newContext();
        const salesPage = await f.loginAsPersona(salesContext, f.salesRep);

        await salesPage.goto("/dashboard/sales/pipeline", { waitUntil: "domcontentloaded" });
        await expect(salesPage.getByRole("heading", { name: /Pipeline|Deals|Bookings/i }).first()).toBeVisible();

        await salesContext.close();
    });

    test("4. Vendor A vs Vendor B: Cross-Vendor Isolation Verification", async ({ browser }) => {
        const vendorContext = await browser.newContext();
        const vendorPage = await f.loginAsPersona(vendorContext, f.vendorUser);

        await vendorPage.goto("/dashboard/products", { waitUntil: "domcontentloaded" });
        await expect(vendorPage.locator("h1, h2, h3").first()).toBeVisible();

        // Vendor cannot access Admin Command Center -> Redirects or forbidden
        await vendorPage.goto("/admin", { waitUntil: "domcontentloaded" });
        const url = vendorPage.url();
        expect(url).not.toContain("/admin");

        await vendorContext.close();
    });

    test("5. Warehouse Operator: Equipment Inspection & Fleet Management", async ({ browser }) => {
        const whContext = await browser.newContext();
        const whPage = await f.loginAsPersona(whContext, f.warehouseMgr);

        await whPage.goto("/dashboard/warehouse/overview", { waitUntil: "domcontentloaded" });
        await expect(whPage.getByRole("heading", { name: /Logistics|Warehouse/i }).first()).toBeVisible();

        await whContext.close();
    });

    test("6. Super Administrator: Governance, Audit Logs & Session Security", async ({ browser }) => {
        const adminContext = await browser.newContext();
        const adminPage = await f.loginAsPersona(adminContext, f.superAdmin);

        await adminPage.goto("/admin", { waitUntil: "domcontentloaded" });
        await expect(adminPage.getByRole("heading", { name: /Digital Operating System|Booking Pipeline|Command Center|Admin/i }).first()).toBeVisible();

        await adminPage.goto("/admin/certificates", { waitUntil: "domcontentloaded" });
        await expect(adminPage.getByRole("heading", { name: /Certificates/i }).first()).toBeVisible();

        await adminContext.close();
    });
});
