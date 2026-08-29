import { test, expect } from "@playwright/test";
import { setupE2EFixtures, E2ETestFixtures } from "./fixtures";
import { db } from "../src/lib/db";
import { users, invoices } from "../src/lib/db/schema";
import { USER_ROLES } from "../src/lib/constants";
import { v4 as uuid } from "uuid";
import { eq } from "drizzle-orm";

test.describe("Browser Tenant & Cross-Persona Isolation Attacks", () => {
  let f: E2ETestFixtures;
  let foreignInvoiceId = "";
  let foreignClientId = "";

  test.beforeAll(async () => {
    f = await setupE2EFixtures();
    foreignClientId = uuid();
    const runId = Date.now().toString(36);
    await db.insert(users).values({
      id: foreignClientId,
      name: "Foreign Client B",
      email: `foreign_b_${runId}@attacker.qa`.toLowerCase(),
      role: USER_ROLES.CLIENT,
      status: "active",
    });

    foreignInvoiceId = uuid();
    await db.insert(invoices).values({
      id: foreignInvoiceId,
      invoiceNumber: `INV-FOREIGN-${runId.toUpperCase()}`,
      userId: foreignClientId,
      customerName: "Foreign Client B",
      customerEmail: `foreign_b_${runId}@attacker.qa`.toLowerCase(),
      subtotal: 5000,
      totalAmount: 5000,
      amountPaid: 0,
      amountDue: 5000,
      status: "issued",
      issueDate: new Date(),
      dueDate: new Date(Date.now() + 86400000),
    });
  });

  test.afterAll(async () => {
    if (foreignInvoiceId) await db.delete(invoices).where(eq(invoices.id, foreignInvoiceId));
    if (foreignClientId) await db.delete(users).where(eq(users.id, foreignClientId));
    await f.cleanup();
  });

  test("Client A cannot access Client B PDF invoice via direct URL", async ({ browser }) => {
    const context = await browser.newContext();
    await f.loginAsPersona(context, f.clientUser);

    const attackRes = await context.request.get(`/api/pdf/invoice/${foreignInvoiceId}`);
    expect(attackRes.status()).toBe(403);
    await context.close();
  });

  test("Warehouse Manager cannot access Finance Command Center API", async ({ browser }) => {
    const context = await browser.newContext();
    await f.loginAsPersona(context, f.warehouseMgr);

    const attackRes = await context.request.get("/api/admin/financials/aging");
    expect(attackRes.status()).toBe(403);
    await context.close();
  });

  test("Marketplace Vendor cannot access Admin Command Center", async ({ browser }) => {
    const context = await browser.newContext();
    await f.loginAsPersona(context, f.vendorUser);

    const attackRes = await context.request.get("/api/admin/command-center");
    expect(attackRes.status()).toBe(403);
    await context.close();
  });

  test("Client cannot access Super Admin Logs API", async ({ browser }) => {
    const context = await browser.newContext();
    await f.loginAsPersona(context, f.clientUser);

    const attackRes = await context.request.get("/api/super-admin/logs");
    expect(attackRes.status()).toBe(403);
    await context.close();
  });
});
