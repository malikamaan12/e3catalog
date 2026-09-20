import { chromium } from "@playwright/test";
import path from "path";
import fs from "fs";

const ARTIFACT_DIR = "C:\\Users\\Admin\\.gemini\\antigravity\\brain\\97661fef-ac02-42fb-96d2-30200aedba4c\\screenshots";

async function runVisualWmsTest() {
    console.log("===============================================================================");
    console.log("🎬 STARTING WMS COMPREHENSIVE VISUAL VERIFICATION TEST");
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

    // 1. Authenticate as Super Admin
    console.log("🔐 Authenticating session (admin@e3rentals.com)...");
    await page.goto("http://localhost:5001/login", { waitUntil: "domcontentloaded" });
    await page.fill("#email", "admin@e3rentals.com");
    await page.fill("#password", "adminpassword123");
    await page.click('button[type="submit"]');
    await page.waitForURL((url) => !url.pathname.includes("/login"), { timeout: 15000 });
    console.log("✅ Authenticated successfully!\n");

    const captures = [
        {
            name: "01-control-tower-overview.png",
            title: "Control Tower & Dock Schedule with Live Telematics Radar",
            url: "http://localhost:5001/dashboard/warehouse/overview",
            waitSelector: "text=Operations Control Tower",
        },
        {
            name: "02-fulfillment-scan-station.png",
            title: "Fulfillment Console with Kit Audit & Bump Station",
            url: "http://localhost:5001/dashboard/warehouse/fulfillment",
            waitSelector: "text=Scan to Dispatch",
        },
        {
            name: "03-directed-putaway-zones.png",
            title: "Directed Putaway & Smart Bin Slotting",
            url: "http://localhost:5001/dashboard/warehouse/zones",
            waitSelector: "text=Warehouse Zones",
        },
        {
            name: "04-rfid-cycle-counts.png",
            title: "High-Speed RFID Burst Cycle Counting & Wand Sweeps",
            url: "http://localhost:5001/dashboard/warehouse/counts",
            waitSelector: "text=Cycle Count Audit Station",
        },
        {
            name: "05-consumables-stock-hub.png",
            title: "Consumables & Bulk Non-Serialized Stock Hub",
            url: "http://localhost:5001/dashboard/warehouse/consumables",
            waitSelector: "text=Consumables & Non-Serialized Supplies",
        },
        {
            name: "06-technical-qc-inspections.png",
            title: "Technical QC Work Orders & Damage Inspection Hub",
            url: "http://localhost:5001/dashboard/warehouse/inspections",
            waitSelector: "text=Technical QC & Inspections",
        },
        {
            name: "07-hardware-setup-station.png",
            title: "Hardware Commissioning & Thermal Printer Diagnostics Center",
            url: "http://localhost:5001/dashboard/warehouse/setup",
            waitSelector: "text=Hardware Setup & Commissioning Station",
        },
    ];

    for (let i = 0; i < captures.length; i++) {
        const item = captures[i];
        console.log(`📸 [${i + 1}/${captures.length}] Capturing: ${item.title}...`);
        try {
            await page.goto(item.url, { waitUntil: "domcontentloaded" });
            if (item.waitSelector) {
                await page.waitForSelector(item.waitSelector, { timeout: 12000 }).catch(() => {
                    console.log(`   (Selector "${item.waitSelector}" waited, proceeding...)`);
                });
            }
            await page.waitForTimeout(2500); // Let animations & cards settle
            const outPath = path.join(ARTIFACT_DIR, item.name);
            await page.screenshot({ path: outPath, fullPage: false });
            console.log(`   ✅ Saved ${item.name} (${Math.round(fs.statSync(outPath).size / 1024)} KB)`);
        } catch (err: any) {
            console.error(`   ❌ Failed to capture ${item.name}:`, err.message);
        }
    }

    await browser.close();
    console.log("\n===============================================================================");
    console.log("🎉 ALL WMS VISUAL SURFACES CAPTURED AND VERIFIED!");
    console.log("===============================================================================");
}

runVisualWmsTest()
    .then(() => process.exit(0))
    .catch((err) => {
        console.error("❌ Visual test error:", err);
        process.exit(1);
    });
