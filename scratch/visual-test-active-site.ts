import { chromium } from "@playwright/test";
import path from "path";
import fs from "fs";

const ACTIVE_SITE = "https://e3catalog.vercel.app";
const ARTIFACT_DIR = "C:\\Users\\Admin\\.gemini\\antigravity\\brain\\97661fef-ac02-42fb-96d2-30200aedba4c\\screenshots\\active-site";

async function runActiveSiteVisualTest() {
    console.log("===============================================================================");
    console.log(`🎬 STARTING ACTIVE WEBSITE VISUAL AUDIT: ${ACTIVE_SITE}`);
    console.log("===============================================================================\n");

    if (!fs.existsSync(ARTIFACT_DIR)) {
        fs.mkdirSync(ARTIFACT_DIR, { recursive: true });
    }

    const browser = await chromium.launch({
        executablePath: "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
        headless: true,
    });

    const context = await browser.newContext({
        viewport: { width: 1440, height: 900 },
        deviceScaleFactor: 1.5,
    });

    const page = await context.newPage();

    // Listen to console errors and network failures
    page.on("console", (msg) => {
        if (msg.type() === "error") {
            console.log(`   [Browser Console Error]: ${msg.text().slice(0, 120)}`);
        }
    });

    page.on("requestfailed", (req) => {
        console.log(`   [Network Failed]: ${req.method()} ${req.url()}`);
    });

    // 1. Capture Storefront Public Pages first
    console.log("📸 [1/10] Capturing Storefront Homepage...");
    try {
        await page.goto(`${ACTIVE_SITE}/`, { waitUntil: "networkidle", timeout: 30000 });
        await page.waitForTimeout(2000);
        const outPath = path.join(ARTIFACT_DIR, "01-active-storefront-home.png");
        await page.screenshot({ path: outPath, fullPage: false });
        console.log(`   ✅ Saved 01-active-storefront-home.png (${Math.round(fs.statSync(outPath).size / 1024)} KB)`);
    } catch (e: any) {
        console.error(`   ❌ Failed to capture homepage: ${e.message}`);
    }

    console.log("📸 [2/10] Capturing Equipment Catalog...");
    try {
        await page.goto(`${ACTIVE_SITE}/catalog`, { waitUntil: "networkidle", timeout: 30000 });
        await page.waitForTimeout(2000);
        const outPath = path.join(ARTIFACT_DIR, "02-active-catalog.png");
        await page.screenshot({ path: outPath, fullPage: false });
        console.log(`   ✅ Saved 02-active-catalog.png (${Math.round(fs.statSync(outPath).size / 1024)} KB)`);
    } catch (e: any) {
        console.error(`   ❌ Failed to capture catalog: ${e.message}`);
    }

    // 2. Authenticate
    console.log("\n🔐 Authenticating session on active site (admin@e3rentals.com)...");
    try {
        await page.goto(`${ACTIVE_SITE}/login`, { waitUntil: "networkidle", timeout: 30000 });
        await page.waitForTimeout(1000);
        await page.fill("#email", "admin@e3rentals.com");
        await page.fill("#password", "adminpassword123");
        await page.click('button[type="submit"]');
        await page.waitForURL((url) => !url.pathname.includes("/login"), { timeout: 20000 });
        console.log(`   ✅ Authenticated successfully! Current URL: ${page.url()}\n`);
    } catch (e: any) {
        console.error(`   ❌ Login failed: ${e.message}`);
        const loginErrPath = path.join(ARTIFACT_DIR, "login-error.png");
        await page.screenshot({ path: loginErrPath });
        console.log(`   📸 Saved login-error.png`);
    }

    const wmsCaptures = [
        {
            name: "03-active-control-tower-overview.png",
            title: "Control Tower & Dock Radar",
            url: `${ACTIVE_SITE}/dashboard/warehouse/overview`,
            waitSelector: "text=Operations Control Tower",
        },
        {
            name: "04-active-fulfillment-scan-station.png",
            title: "Fulfillment Console & Scan Station",
            url: `${ACTIVE_SITE}/dashboard/warehouse/fulfillment`,
            waitSelector: "text=Scan to Dispatch",
        },
        {
            name: "05-active-directed-putaway-zones.png",
            title: "Directed Putaway & Smart Bin Slotting",
            url: `${ACTIVE_SITE}/dashboard/warehouse/zones`,
            waitSelector: "text=Warehouse Zones",
        },
        {
            name: "06-active-rfid-cycle-counts.png",
            title: "High-Speed RFID Burst Cycle Counting",
            url: `${ACTIVE_SITE}/dashboard/warehouse/counts`,
            waitSelector: "text=Cycle Count Audit Station",
        },
        {
            name: "07-active-consumables-stock-hub.png",
            title: "Consumables & Bulk Non-Serialized Stock Hub",
            url: `${ACTIVE_SITE}/dashboard/warehouse/consumables`,
            waitSelector: "text=Consumables & Non-Serialized Supplies",
        },
        {
            name: "08-active-technical-qc-inspections.png",
            title: "Technical QC Work Orders & Damage Inspections",
            url: `${ACTIVE_SITE}/dashboard/warehouse/inspections`,
            waitSelector: "text=Technical QC & Inspections",
        },
        {
            name: "09-active-hardware-setup-station.png",
            title: "Hardware Commissioning & Thermal Printer Station",
            url: `${ACTIVE_SITE}/dashboard/warehouse/setup`,
            waitSelector: "text=Hardware Setup & Commissioning Station",
        },
        {
            name: "10-active-main-dashboard.png",
            title: "Executive Inventory & Rental Dashboard",
            url: `${ACTIVE_SITE}/dashboard`,
            waitSelector: "text=Dashboard",
        },
    ];

    for (let i = 0; i < wmsCaptures.length; i++) {
        const item = wmsCaptures[i];
        console.log(`📸 [${i + 3}/10] Capturing ${item.title}...`);
        try {
            await page.goto(item.url, { waitUntil: "domcontentloaded", timeout: 30000 });
            if (item.waitSelector) {
                await page.waitForSelector(item.waitSelector, { timeout: 15000 }).catch(() => {
                    console.log(`   (Selector "${item.waitSelector}" not detected within 15s, proceeding...)`);
                });
            }
            await page.waitForTimeout(2500); // Allow data hydration and animations
            const outPath = path.join(ARTIFACT_DIR, item.name);
            await page.screenshot({ path: outPath, fullPage: false });
            console.log(`   ✅ Saved ${item.name} (${Math.round(fs.statSync(outPath).size / 1024)} KB)`);
        } catch (err: any) {
            console.error(`   ❌ Failed to capture ${item.name}: ${err.message}`);
        }
    }

    await browser.close();
    console.log("\n===============================================================================");
    console.log("🎉 ACTIVE WEBSITE VISUAL AUDIT COMPLETED!");
    console.log("===============================================================================");
}

runActiveSiteVisualTest()
    .then(() => process.exit(0))
    .catch((err) => {
        console.error("❌ Visual test execution failure:", err);
        process.exit(1);
    });
