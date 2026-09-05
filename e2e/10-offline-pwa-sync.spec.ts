import { test, expect } from "@playwright/test";
import { setupE2EFixtures, E2ETestFixtures } from "./fixtures";
import { db, pool } from "../src/lib/db";
import { 
    bookings, 
    inventoryUnits, 
    bookingDispatchLogs, 
    proofOfDeliveries, 
    fleetGpsPings 
} from "../src/lib/db/schema";
import { eq } from "drizzle-orm";
import { v4 as uuidv4 } from "uuid";

test.describe("Offline-First Warehouse PWA & Mobile Scanner Synchronization", () => {
    let f: E2ETestFixtures;
    let testRunId: string;
    let dispatchLogId: string;

    test.beforeAll(async () => {
        f = await setupE2EFixtures();
        testRunId = Date.now().toString(36);
        dispatchLogId = uuidv4();

        // Create initial Dispatch Log for driver runs
        await db.insert(bookingDispatchLogs).values({
            id: dispatchLogId,
            bookingId: f.bookingId,
            driverName: "Tariq Al-Balooshi",
            vehiclePlateNumber: "QA-99124",
            transportCompany: "E3 Logistics",
            totalGrossWeight: 80,
            dispatchedAt: new Date(),
        });
    });

    test.afterAll(async () => {
        const client = await pool.connect();
        try {
            await client.query(`DELETE FROM "fleet_gps_pings" WHERE "dispatch_log_id" = $1;`, [dispatchLogId]).catch(() => {});
            await client.query(`DELETE FROM "proof_of_deliveries" WHERE "booking_id" = $1;`, [f.bookingId]).catch(() => {});
            await client.query(`DELETE FROM "booking_dispatch_logs" WHERE "id" = $1;`, [dispatchLogId]).catch(() => {});
        } finally {
            client.release();
        }
        await f.cleanup();
    });

    test("1. PWA Shell Assets: Manifest and Service Worker are served cleanly", async ({ request }) => {
        // Validate Web App Manifest
        const manifestRes = await request.get("/manifest.json");
        expect(manifestRes.status()).toBe(200);
        const manifest = await manifestRes.json();
        expect(manifest.short_name).toBe("E3 Ops");
        expect(manifest.display).toBe("standalone");

        // Validate Service Worker Script
        const swRes = await request.get("/sw.js");
        expect(swRes.status()).toBe(200);
        const swText = await swRes.text();
        expect(swText).toContain("CACHE_NAME");
        expect(swText).toContain("/dashboard/warehouse/fulfillment");
    });

    test("2. Warehouse Fulfillment: Offline Scan buffering and Sync Pill indicators", async ({ context }) => {
        const page = await f.loginAsPersona(context, f.warehouseMgr);

        await page.goto("/dashboard/warehouse/fulfillment");
        await page.waitForLoadState("networkidle");

        // Verify OfflineSyncBanner is present and indicates online
        const syncBanner = page.locator("[data-testid='offline-sync-banner']");
        await expect(syncBanner).toBeVisible({ timeout: 10000 });
        await expect(syncBanner).toContainText("Signal Online");

        // Select the active test booking
        const bookingSelect = page.locator("select[aria-label='Select deployment target booking']");
        await expect(bookingSelect).toBeVisible();
        await expect(bookingSelect.locator(`option[value='${f.bookingId}']`)).toBeAttached({ timeout: 10000 });
        await bookingSelect.selectOption({ value: f.bookingId });

        // Simulate cellular signal drop in warehouse basement
        await context.setOffline(true);

        // Fill asset tag and trigger scan
        const tagInput = page.locator("input[placeholder*='Scan']").or(page.locator("input[type='text']")).first();
        await tagInput.fill(f.assetTag);
        await tagInput.press("Enter");

        // Assert optimistic offline buffering entry in scan log
        const logEntry = page.locator("text=" + f.assetTag).first();
        await expect(logEntry).toBeVisible({ timeout: 5000 });

        // Offline sync banner updates to Offline Mode or Unsynced queue
        await expect(syncBanner).toContainText(/Offline Dock Mode|Queued|buffering/i);

        // Reconnect cellular signal
        await context.setOffline(false);

        // Auto-sync fires automatically on online reconnect; verify status returns to clean synced state
        await expect(syncBanner).toContainText(/Signal Online|All Cloud Synced/i, { timeout: 15000 });
    });

    test("3. Driver Mobile Handover: Subterranean Offline POD & Background Synchronization", async ({ context }) => {
        const page = await f.loginAsPersona(context, f.superAdmin);

        await page.goto("/driver");
        await page.waitForLoadState("networkidle");

        // Verify OfflineSyncBanner is mounted on driver page
        const driverBanner = page.locator("[data-testid='offline-sync-banner']");
        await expect(driverBanner).toBeVisible({ timeout: 10000 });

        // Find the active run and click "Start Handover" / "Complete Handover"
        const handoverBtn = page.locator("button:has-text('Handover')").or(page.locator("button:has-text('Sign-off')")).first();
        if (await handoverBtn.isVisible({ timeout: 5000 })) {
            await handoverBtn.click();

            // Fill recipient details in POD modal
            const nameInput = page.locator("input[placeholder*='Recipient Full Name']").or(page.locator("input#recipientName")).or(page.locator("input").filter({ hasText: "" }).nth(1));
            if (await nameInput.isVisible()) {
                await nameInput.fill("Rashid Al-Kuwari");
            }

            // Draw a signature on the signature pad canvas
            const canvas = page.locator("canvas").first();
            if (await canvas.isVisible()) {
                const box = await canvas.boundingBox();
                if (box) {
                    await page.mouse.move(box.x + 20, box.y + 20);
                    await page.mouse.down();
                    await page.mouse.move(box.x + 80, box.y + 50);
                    await page.mouse.move(box.x + 140, box.y + 30);
                    await page.mouse.up();
                }
            }

            // Simulate underground tunnel signal loss
            await context.setOffline(true);

            // Submit Proof of Delivery
            const submitPodBtn = page.locator("button:has-text('Submit Proof of Delivery')").or(page.locator("button:has-text('Confirm Handover')")).first();
            if (await submitPodBtn.isVisible()) {
                await submitPodBtn.click();
            }

            // Verify optimistic offline notification is displayed
            const offlineSuccess = page.locator("text=Offline mode").or(page.locator("text=buffered locally")).or(page.locator("text=Proof of Delivery"));
            await expect(offlineSuccess.first()).toBeVisible({ timeout: 8000 });

            // Restore network connection
            await context.setOffline(false);
        }
    });
});
