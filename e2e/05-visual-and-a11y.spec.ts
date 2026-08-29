import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { setupE2EFixtures, E2ETestFixtures } from "./fixtures";
import * as fs from "fs";
import * as path from "path";

const screenshotDir = path.join(process.cwd(), "screenshots");
if (!fs.existsSync(screenshotDir)) {
  fs.mkdirSync(screenshotDir, { recursive: true });
}

test.describe("Visual UX Screenshot Capture & Axe A11y Auditing", () => {
  let f: E2ETestFixtures;

  test.beforeAll(async () => {
    f = await setupE2EFixtures();
  });

  test.afterAll(async () => {
    await f.cleanup();
  });

  const routesToAudit = [
    { path: "/", name: "homepage", persona: "public" },
    { path: "/catalog", name: "catalog", persona: "public" },
    { path: "/cart", name: "cart", persona: "public" },
    { path: "/login", name: "login", persona: "public" },
    { path: "/vendors", name: "vendors_landing", persona: "public" },
    { path: "/dashboard/client/overview", name: "client_overview", persona: "client" },
    { path: "/dashboard/client/invoices", name: "client_invoices", persona: "client" },
    { path: "/dashboard/products", name: "vendor_products", persona: "vendor" },
    { path: "/dashboard/inventory", name: "vendor_inventory", persona: "vendor" },
    { path: "/dashboard/settlements", name: "vendor_settlements", persona: "vendor" },
    { path: "/dashboard/sales/overview", name: "sales_overview", persona: "sales" },
    { path: "/dashboard/sales/pipeline", name: "sales_pipeline", persona: "sales" },
    { path: "/dashboard/warehouse/overview", name: "warehouse_overview", persona: "warehouse" },
    { path: "/dashboard/warehouse/fleet", name: "warehouse_fleet", persona: "warehouse" },
    { path: "/dashboard/warehouse/fulfillment", name: "warehouse_fulfillment", persona: "warehouse" },
    { path: "/dashboard/warehouse/dispatch", name: "warehouse_dispatch", persona: "warehouse" },
    { path: "/dashboard/warehouse/inspections", name: "warehouse_inspections", persona: "warehouse" },
    { path: "/admin", name: "admin_command_center", persona: "admin" },
    { path: "/admin/analytics", name: "admin_analytics", persona: "admin" },
    { path: "/admin/financials", name: "admin_financials", persona: "admin" },
    { path: "/admin/bookings", name: "admin_bookings", persona: "admin" },
    { path: "/admin/products", name: "admin_products", persona: "admin" },
    { path: "/admin/certificates", name: "admin_certificates", persona: "admin" },
  ];

  for (const r of routesToAudit) {
    test(`Audit & Capture ${r.name} (${r.path})`, async ({ browser }) => {
      const context = await browser.newContext({ viewport: { width: 1920, height: 1080 } });
      let page;
      if (r.persona === "admin") page = await f.loginAsPersona(context, f.superAdmin);
      else if (r.persona === "client") page = await f.loginAsPersona(context, f.clientUser);
      else if (r.persona === "vendor") page = await f.loginAsPersona(context, f.vendorUser);
      else if (r.persona === "sales") page = await f.loginAsPersona(context, f.salesRep);
      else if (r.persona === "warehouse") page = await f.loginAsPersona(context, f.warehouseMgr);
      else page = await context.newPage();

      const errors: string[] = [];
      page.on("pageerror", (err) => errors.push(err.message));

      await page.goto(r.path, { waitUntil: "domcontentloaded" });
      await page.waitForTimeout(500);

      // 1. Desktop Screenshot
      await page.screenshot({ path: path.join(screenshotDir, `desktop_${r.name}.png`), fullPage: false });

      // 2. Mobile Screenshot
      await page.setViewportSize({ width: 390, height: 844 });
      await page.waitForTimeout(300);
      await page.screenshot({ path: path.join(screenshotDir, `mobile_${r.name}.png`), fullPage: false });

      // 3. Axe A11y Scan (Desktop size)
      await page.setViewportSize({ width: 1920, height: 1080 });
      const accessibilityScanResults = await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
        .analyze();

      const criticalViolations = accessibilityScanResults.violations.filter(v => v.impact === "critical");
      expect(criticalViolations.length, `Found ${criticalViolations.length} critical a11y violations on ${r.path}`).toBe(0);

      expect(errors.length, `Uncaught page errors on ${r.path}: ${errors.join(", ")}`).toBe(0);

      await context.close();
    });
  }
});
