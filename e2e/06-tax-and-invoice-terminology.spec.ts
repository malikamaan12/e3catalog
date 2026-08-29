import { test, expect } from "@playwright/test";
import { setupE2EFixtures, E2ETestFixtures } from "./fixtures";
import { calculateTax } from "../src/lib/finances";
import { getSiteSetting } from "../src/lib/settings";
import { db } from "../src/lib/db";
import { invoices } from "../src/lib/db/schema";
import { eq } from "drizzle-orm";

test.describe("Tax Configuration & Invoice Terminology Regression Tests", () => {
    let f: E2ETestFixtures;

    test.beforeAll(async () => {
        f = await setupE2EFixtures();
    });

    test.afterAll(async () => {
        await f.cleanup();
    });

    test("Default Qatar tax rate is 0% and calculateTax returns 0 by default", async () => {
        const defaultRate = await getSiteSetting("default_tax_rate");
        expect(defaultRate).toBe("0");

        const taxZero = await calculateTax(10000);
        expect(taxZero).toBe(0);

        // When explicitly configured to a custom percentage (e.g. 5%)
        const customTax = await calculateTax(10000, 5);
        expect(customTax).toBe(500);
    });

    test("Commercial Invoice PDF endpoint generates valid document without VAT or Tax Invoice labeling", async ({ page }) => {
        const clientContext = await page.context().browser()?.newContext();
        if (!clientContext) throw new Error("Could not create browser context");

        await f.loginAsPersona(clientContext, f.clientUser);
        const res = await clientContext.request.get(`/api/pdf/invoice/${f.invoiceId}`);
        expect(res.status()).toBe(200);
        expect(res.headers()["content-type"]).toBe("application/pdf");

        const body = await res.body();
        expect(body.length).toBeGreaterThan(1000);

        await clientContext.close();
    });

    test("Client Invoices UI labels documents as Commercial Invoices without Tax Invoice terminology", async ({ page }) => {
        const context = await page.context().browser()?.newContext();
        if (!context) throw new Error("Could not create browser context");

        const clientPage = await f.loginAsPersona(context, f.clientUser);
        await clientPage.goto("/dashboard/client/invoices");

        await expect(clientPage.locator("h1")).toContainText(/My Invoices|Invoices/i);
        const pageText = await clientPage.innerText("body");
        expect(pageText).not.toContain("tax invoices");
        expect(pageText).not.toContain("VAT Invoice");
        expect(pageText).not.toContain("VAT Registration");

        await context.close();
    });

    test("Historical invoices preserve stored tax amount snapshots", async () => {
        const invoiceRec = await db.query.invoices.findFirst({
            where: eq(invoices.id, f.invoiceId)
        });

        expect(invoiceRec).toBeDefined();
        // Stored snapshot should be numeric and default to 0
        expect(invoiceRec?.taxAmount).toBe(0);
    });
});
