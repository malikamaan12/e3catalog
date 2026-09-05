import { test, expect } from "@playwright/test";
import { setupE2EFixtures, E2ETestFixtures } from "./fixtures";
import { db, pool } from "../src/lib/db";
import { crossHireOrders } from "../src/lib/db/schema";
import { eq } from "drizzle-orm";
import { v4 as uuidv4 } from "uuid";

test.describe("Enterprise Milestone Tracks 7–10 Verification Suite", () => {
    let f: E2ETestFixtures;
    let crossHireOrderId: string;

    test.beforeAll(async () => {
        f = await setupE2EFixtures();
        crossHireOrderId = uuidv4();

        // Seed a sample cross-hire order for the test fixtures
        await db.insert(crossHireOrders).values({
            id: crossHireOrderId,
            orderNumber: `XHIRE-E2E-${Date.now().toString(36).toUpperCase()}`,
            bookingId: f.bookingId,
            supplierVendorId: f.vendorProfileId,
            supplierName: "Apex Rigging & Staging LLC",
            supplierContact: "+974 5588 7766",
            productId: f.productId,
            unitsRequested: 2,
            periodStart: new Date(),
            periodEnd: new Date(Date.now() + 86400000 * 3),
            supplierDailyRate: 300,
            clientDailyRate: 750,
            totalSupplierCost: 1800,
            totalClientRevenue: 4500,
            profitMargin: 2700,
            status: "requested",
            assetTagAllocations: [],
            notes: "E2E Automated Cross-Hire Allocation Test",
        });
    });

    test.afterAll(async () => {
        const client = await pool.connect();
        try {
            await client.query(`DELETE FROM "cross_hire_orders" WHERE "id" = $1;`, [crossHireOrderId]).catch(() => {});
        } finally {
            client.release();
        }
        await f.cleanup();
    });

    test("1. Track 7: Cross-Hire Cockpit UI & Shortage API", async ({ context }) => {
        const page = await f.loginAsPersona(context, f.warehouseMgr);

        // 1a. Test Shortages API with authenticated context
        const shortageRes = await page.request.get("/api/admin/cross-hires/shortages");
        expect(shortageRes.status()).toBe(200);
        const shortageData = await shortageRes.json();
        expect(Array.isArray(shortageData.shortageDossiers) || Array.isArray(shortageData)).toBe(true);

        // 1b. Test Cockpit UI in Warehouse Dispatch
        await page.goto("/dashboard/warehouse/dispatch?tab=cross_hires");
        await page.waitForLoadState("networkidle");

        // Verify Cockpit Cards & Inbound Receiving controls are rendered
        const cockpit = page.locator("[data-testid='cross-hire-cockpit']");
        await expect(cockpit).toBeVisible({ timeout: 10000 });

        const cockpitTitle = page.locator("text=Sub-Rental & Cross-Hire Network");
        await expect(cockpitTitle).toBeVisible();

        const ordersHeading = page.locator("text=Active Sub-Rental Manifests");
        await expect(ordersHeading).toBeVisible();

        // Verify the seeded order is listed in the cockpit table
        const orderRow = page.locator("text=Apex Rigging & Staging LLC");
        await expect(orderRow).toBeVisible();
    });

    test("2. Track 8: Field Notifications Gateway & Outbox Inspection", async ({ context }) => {
        const page = await f.loginAsPersona(context, f.admin);
        // Verify notification outbox API responds cleanly
        const outboxRes = await page.request.get("/api/admin/notifications/outbox");
        expect(outboxRes.status()).toBe(200);
        const outboxData = await outboxRes.json();
        expect(Array.isArray(outboxData.outbox) || Array.isArray(outboxData)).toBe(true);
    });

    test("3. Track 9: Bilingual MOCI / GTA Tax Invoice Exporter", async ({ request }) => {
        // 3a. JSON payload format for GTA/MOCI system integration
        const jsonRes = await request.get(`/api/pdf/bilingual-invoice/${f.invoiceId}?format=json`);
        expect(jsonRes.status()).toBe(200);
        const invoiceData = await jsonRes.json();
        expect(invoiceData.documentType).toBe("MOCI_BILINGUAL_TAX_INVOICE");
        expect(invoiceData.jurisdiction).toContain("Qatar");
        expect(invoiceData.header?.titleArabic).toBe("فاتورة ضريبية رسمية");
        expect(invoiceData.header?.crNumber).toBeTruthy();
        expect(invoiceData.gtaVerificationQr).toBeTruthy();

        // 3b. HTML/PDF Print Layout
        const htmlRes = await request.get(`/api/pdf/bilingual-invoice/${f.invoiceId}`);
        expect(htmlRes.status()).toBe(200);
        expect(htmlRes.headers()["content-type"]).toContain("text/html");
        const htmlText = await htmlRes.text();
        expect(htmlText).toContain("فاتورة ضريبية رسمية");
        expect(htmlText).toContain("Official Commercial Tax Invoice");
        expect(htmlText).toContain("dir=\"rtl\"");
    });

    test("4. Track 9: Qatar Civil Defence Fire-Retardant Safety Clearance", async ({ request }) => {
        // 4a. JSON compliance clearance record
        const jsonRes = await request.get(`/api/pdf/civil-defence/${f.bookingId}?format=json`);
        expect(jsonRes.status()).toBe(200);
        const cdData = await jsonRes.json();
        expect(cdData.clearanceReference).toMatch(/^QCDD-CLR-/);
        expect(cdData.issuingAuthority.ministryArabic).toContain("وزارة الداخلية");
        expect(cdData.fireSafetyCompliance.flameRetardantStandard).toContain("DIN 4102-B1");
        expect(cdData.officerApproval.verificationToken).toBeTruthy();

        // 4b. HTML Printable Clearance Dossier
        const htmlRes = await request.get(`/api/pdf/civil-defence/${f.bookingId}`);
        expect(htmlRes.status()).toBe(200);
        const htmlText = await htmlRes.text();
        expect(htmlText).toContain("شهادة مطابقة وتصريح سلامة");
        expect(htmlText).toContain("General Directorate of Civil Defence");
        expect(htmlText).toContain("DIN 4102-B1");
    });

    test("5. Track 9: Kahramaa 3-Phase Electrical Load Calculation Schedule", async ({ request }) => {
        // 5a. JSON engineering calculation payload
        const jsonRes = await request.get(`/api/pdf/kahramaa/${f.bookingId}?format=json`);
        expect(jsonRes.status()).toBe(200);
        const khData = await jsonRes.json();
        expect(khData.scheduleReference).toMatch(/^KHM-ELEC-/);
        expect(khData.authority.arabic).toContain("كهرماء");
        expect(khData.summaryLoads.totalConnectedLoadKw).toBeGreaterThan(0);
        expect(khData.summaryLoads.recommendedGeneratorRatingKva).toBeGreaterThan(0);
        expect(khData.safetyAndEarthingStandards.rcdProtection).toContain("30mA");
        expect(khData.engineerApproval.verificationToken).toBeTruthy();

        // 5b. HTML Printable Engineering Report
        const htmlRes = await request.get(`/api/pdf/kahramaa/${f.bookingId}`);
        expect(htmlRes.status()).toBe(200);
        const htmlText = await htmlRes.text();
        expect(htmlText).toContain("جدول حساب الأحمال الكهربائية");
        expect(htmlText).toContain("KAHRAMAA");
        expect(htmlText).toContain("Red Phase");
    });

    test("6. Track 10: Standalone Production Security & Health Endpoint", async ({ request }) => {
        const healthRes = await request.get("/api/health");
        expect(healthRes.status()).toBe(200);
        const health = await healthRes.json();
        expect(health.status).toBe("ok");

        // Verify Security Hardening Headers on responses
        const headers = healthRes.headers();
        expect(headers["x-frame-options"]).toBe("DENY");
        expect(headers["x-content-type-options"]).toBe("nosniff");
        expect(headers["referrer-policy"]).toBe("strict-origin-when-cross-origin");
    });
});
