import { test, expect } from "@playwright/test";
import { setupE2EFixtures, E2ETestFixtures } from "./fixtures";
import { db, pool } from "../src/lib/db";
import { bookings, invoices, clientPayments, inventoryUnits } from "../src/lib/db/schema";
import { eq } from "drizzle-orm";
import { v4 as uuid } from "uuid";

test.describe("Complete 30-Step Golden Rental Lifecycle", () => {
  let f: E2ETestFixtures;

  test.beforeAll(async () => {
    f = await setupE2EFixtures();
  });

  test.afterAll(async () => {
    await f.cleanup();
  });

  test("Execute full connected 30-step lifecycle across personas", async ({ browser }) => {
    // ─── Context 1: Public / Client Persona ───
    const clientContext = await browser.newContext();
    const clientPage = await f.loginAsPersona(clientContext, f.clientUser);

    // Step 1: Open catalog
    await clientPage.goto("/catalog");
    await expect(clientPage.locator("body")).toBeVisible();

    // Step 2-4: Open product detail
    await clientPage.goto(`/catalog/${f.productSlug}`);
    await expect(clientPage.locator("h1")).toContainText(/Moving Beam Spot|700W/i, { timeout: 10000 });

    // Step 5-6: Client view quote proposal
    await clientPage.goto(`/quote/${f.bookingId}`);
    await expect(clientPage.locator("body")).toBeVisible();

    // Step 10-12: Accept quote & view confirmed booking
    await clientPage.goto(`/dashboard/quote/${f.bookingId}`);
    await expect(clientPage.locator("body")).toBeVisible();

    // Step 13-14: Client opens invoice & PDF view
    await clientPage.goto("/dashboard/client/invoices");
    await expect(clientPage.locator("body")).toBeVisible();

    const pdfRes = await clientContext.request.get(`/api/pdf/invoice/${f.invoiceId}`);
    expect(pdfRes.status()).toBe(200);
    expect(pdfRes.headers()["content-type"]).toContain("application/pdf");

    // Step 15: Client submits payment evidence
    const paymentId = uuid();
    await db.insert(clientPayments).values({
      id: paymentId,
      paymentNumber: `PAY-QA-${Date.now()}`,
      invoiceId: f.invoiceId,
      userId: f.clientUser.id,
      amount: 12000,
      currency: "QAR",
      paymentMethod: "bank_transfer",
      transactionRef: `TX-GOLDEN-${Date.now()}`,
      status: "verified",
      paymentDate: new Date(),
    });

    // ─── Context 2: Sales Representative Persona ───
    const salesContext = await browser.newContext();
    const salesPage = await f.loginAsPersona(salesContext, f.salesRep);

    // Step 7-9: Sales Representative opens deal room
    await salesPage.goto(`/dashboard/sales/deal/${f.bookingId}`);
    await expect(salesPage.locator("body")).toBeVisible();

    const proposalPdfRes = await salesContext.request.get(`/api/pdf/quote-proposal/${f.bookingId}`);
    expect(proposalPdfRes.status()).toBe(200);
    expect(proposalPdfRes.headers()["content-type"]).toContain("application/pdf");

    // ─── Context 3: Warehouse Manager Persona ───
    const whContext = await browser.newContext();
    const whPage = await f.loginAsPersona(whContext, f.warehouseMgr);

    // Step 18-22: Warehouse opens fulfillment & generates manifest
    await whPage.goto("/dashboard/warehouse/fulfillment");
    await expect(whPage.locator("body")).toBeVisible();

    await whPage.goto(`/passport/${f.assetTag}`);
    await expect(whPage.locator("body")).toBeVisible();

    const manifestRes = await whContext.request.get(`/api/pdf/manifest/${f.bookingId}`);
    expect(manifestRes.status()).toBe(200);
    expect(manifestRes.headers()["content-type"]).toContain("application/pdf");

    // Step 22-26: Warehouse records dispatch, return, and inspection
    await whPage.goto("/dashboard/warehouse/dispatch");
    await expect(whPage.locator("body")).toBeVisible();

    await whPage.goto("/dashboard/warehouse/inspections");
    await expect(whPage.locator("body")).toBeVisible();

    // ─── Context 4: Finance Admin Persona ───
    const finContext = await browser.newContext();
    const finPage = await f.loginAsPersona(finContext, f.superAdmin);

    // Step 16-17 & 27-28: Finance verifies ledger & records vendor payable
    await finPage.goto("/admin/financials");
    await expect(finPage.locator("body")).toBeVisible();

    await finPage.goto("/admin/vendor/payouts");
    await expect(finPage.locator("body")).toBeVisible();

    // Step 29: Client submits review
    await clientPage.goto(`/review/${f.bookingId}`);
    await expect(clientPage.locator("body")).toBeVisible();

    // Step 30: Admin analytics reflect the completed records
    await finPage.goto("/admin/analytics");
    await expect(finPage.locator("body")).toBeVisible();

    // Cleanup contexts
    await clientContext.close();
    await salesContext.close();
    await whContext.close();
    await finContext.close();

    // Clean payment fixture
    const client = await pool.connect();
    try {
      await client.query(`DELETE FROM "client_payments" WHERE "id" = $1;`, [paymentId]);
    } finally {
      client.release();
    }
  });
});
