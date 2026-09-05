import { chromium } from "playwright";
import { setupE2EFixtures } from "../e2e/fixtures";
import { db, pool } from "../src/lib/db";
import { crossHireOrders } from "../src/lib/db/schema";
import { v4 as uuidv4 } from "uuid";
import path from "path";

async function captureScreenshots() {
    const outputDir = "C:\\Users\\Admin\\.gemini\\antigravity\\brain\\32a777ac-3518-4eaa-a5d5-ee481221323d\\screenshots";
    const f = await setupE2EFixtures();
    const crossHireOrderId = uuidv4();

    await db.insert(crossHireOrders).values({
        id: crossHireOrderId,
        orderNumber: `XHIRE-${Date.now().toString(36).toUpperCase()}`,
        bookingId: f.bookingId,
        supplierVendorId: f.vendorProfileId,
        supplierName: "Apex Rigging & Staging LLC",
        supplierContact: "+974 5588 7766",
        productId: f.productId,
        unitsRequested: 4,
        periodStart: new Date(),
        periodEnd: new Date(Date.now() + 86400000 * 4),
        supplierDailyRate: 350,
        clientDailyRate: 850,
        totalSupplierCost: 5600,
        totalClientRevenue: 13600,
        profitMargin: 8000,
        status: "requested",
        assetTagAllocations: [],
        notes: "National Day Production Rigging Sub-Rental",
    });

    const browser = await chromium.launch();
    const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });

    try {
        const page = await f.loginAsPersona(context, f.warehouseMgr);

        // 1. Cross-Hire Cockpit
        await page.goto("http://localhost:5001/dashboard/warehouse/dispatch?tab=cross_hires");
        await page.waitForLoadState("networkidle");
        await page.waitForTimeout(1000);
        await page.screenshot({ path: path.join(outputDir, "13-track7-cross-hire-cockpit.png"), fullPage: true });
        console.log("✓ Captured 13-track7-cross-hire-cockpit.png");

        // 2. Bilingual MOCI / GTA Tax Invoice
        await page.goto(`http://localhost:5001/api/pdf/bilingual-invoice/${f.invoiceId}`);
        await page.waitForLoadState("networkidle");
        await page.screenshot({ path: path.join(outputDir, "14-track9-bilingual-tax-invoice.png"), fullPage: true });
        console.log("✓ Captured 14-track9-bilingual-tax-invoice.png");

        // 3. Qatar Civil Defence Fire Safety Clearance
        await page.goto(`http://localhost:5001/api/pdf/civil-defence/${f.bookingId}`);
        await page.waitForLoadState("networkidle");
        await page.screenshot({ path: path.join(outputDir, "15-track9-civil-defence-clearance.png"), fullPage: true });
        console.log("✓ Captured 15-track9-civil-defence-clearance.png");

        // 4. Kahramaa 3-Phase Electrical Load Schedule
        await page.goto(`http://localhost:5001/api/pdf/kahramaa/${f.bookingId}`);
        await page.waitForLoadState("networkidle");
        await page.screenshot({ path: path.join(outputDir, "16-track9-kahramaa-load-schedule.png"), fullPage: true });
        console.log("✓ Captured 16-track9-kahramaa-load-schedule.png");

    } finally {
        await browser.close();
        const client = await pool.connect();
        try {
            await client.query(`DELETE FROM "cross_hire_orders" WHERE "id" = $1;`, [crossHireOrderId]).catch(() => {});
        } finally {
            client.release();
        }
        await f.cleanup();
        await pool.end();
    }
}

captureScreenshots();
