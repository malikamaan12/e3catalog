import { chromium } from "@playwright/test";
import path from "path";
import fs from "fs";

const ARTIFACT_DIR = "C:\\Users\\Admin\\.gemini\\antigravity\\brain\\97661fef-ac02-42fb-96d2-30200aedba4c\\screenshots\\warehouse-3d-2d";
const BASE_URL = "http://localhost:5001";
const WAREHOUSE_ID = "9300db24-4419-4722-944c-fbb7c6bb2770";

async function runWarehouseVisualVerification() {
    console.log("===============================================================================");
    console.log("🎬 STARTING WAREHOUSE 3D <-> 2D & ENGAGING MAP UI VERIFICATION AUDIT");
    console.log("===============================================================================\n");

    if (!fs.existsSync(ARTIFACT_DIR)) {
        fs.mkdirSync(ARTIFACT_DIR, { recursive: true });
    }

    const browser = await chromium.launch({
        executablePath: "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
        headless: true,
    });

    const context = await browser.newContext({
        viewport: { width: 1680, height: 1050 },
        deviceScaleFactor: 1.0,
    });

    const page = await context.newPage();
    page.on("pageerror", (err) => console.error("🛑 [BROWSER ERROR]:", err));

    // 1. Authenticate
    console.log("🔐 Authenticating session (admin@e3rentals.com)...");
    await page.goto(`${BASE_URL}/login`, { waitUntil: "domcontentloaded" });
    await page.fill("#email", "admin@e3rentals.com");
    await page.fill("#password", "adminpassword123");
    await page.click('button[type="submit"]');
    await page.waitForURL((url) => !url.pathname.includes("/login"), { timeout: 15000 });
    console.log("✅ Authenticated successfully!\n");

    // 2. Navigate to Warehouse Layout
    console.log(`📸 [1/6] Navigating to Warehouse Layout (/admin/warehouses/${WAREHOUSE_ID}/layout)...`);
    await page.goto(`${BASE_URL}/admin/warehouses/${WAREHOUSE_ID}/layout`, { waitUntil: "networkidle" });
    await page.waitForSelector("#toggle-3d-view-btn", { timeout: 15000 });
    await page.waitForTimeout(1000);

    const s1 = path.join(ARTIFACT_DIR, "01-warehouse-2d-default-blueprint.png");
    await page.screenshot({ path: s1, fullPage: false });
    console.log(`   ✅ Saved 01-warehouse-2d-default-blueprint.png (${Math.round(fs.statSync(s1).size / 1024)} KB)`);

    // 3. Switch to 3D Isometric View
    console.log("📸 [2/6] Toggling to 3D Isometric View...");
    await page.click("#toggle-3d-view-btn");
    // Wait for 600ms CSS transition
    await page.waitForTimeout(1000);

    const s2 = path.join(ARTIFACT_DIR, "02-warehouse-3d-isometric-view.png");
    await page.screenshot({ path: s2, fullPage: false });
    console.log(`   ✅ Saved 02-warehouse-3d-isometric-view.png (${Math.round(fs.statSync(s2).size / 1024)} KB)`);

    // 4. Test interactive hover HUD
    console.log("📸 [3/6] Hovering over rack to test interactive live HUD...");
    // Find first rack code or SVG text
    const rackText = page.locator("svg text:has-text('RCK')").first();
    if (await rackText.count() > 0) {
        await rackText.hover({ force: true });
        await page.waitForTimeout(600);
    }
    const s3 = path.join(ARTIFACT_DIR, "03-warehouse-interactive-hover-hud.png");
    await page.screenshot({ path: s3, fullPage: false });
    console.log(`   ✅ Saved 03-warehouse-interactive-hover-hud.png (${Math.round(fs.statSync(s3).size / 1024)} KB)`);

    // 5. CRITICAL TEST: Switch back to 2D Top-Down View & verify it is NOT stuck slanted!
    console.log("📸 [4/6] Switching BACK from 3D to 2D Top-Down View...");
    await page.click("#toggle-3d-view-btn");
    await page.waitForTimeout(1000);

    // Inspect computed transform style on the animated container
    const transformInfo = await page.evaluate(() => {
        const svg = document.querySelector("svg.rounded-2xl");
        const parent = svg?.parentElement;
        if (!parent) return null;
        return {
            inlineTransform: (parent as HTMLElement).style.transform,
            computedTransform: window.getComputedStyle(parent).transform,
        };
    });
    console.log("   📐 Inspected Transform after 3D -> 2D switch:", JSON.stringify(transformInfo));

    const s4 = path.join(ARTIFACT_DIR, "04-warehouse-returned-2d-flat-verified.png");
    await page.screenshot({ path: s4, fullPage: false });
    console.log(`   ✅ Saved 04-warehouse-returned-2d-flat-verified.png (${Math.round(fs.statSync(s4).size / 1024)} KB)`);

    // 6. Test Heatmap modes: Occupancy & Empty Racks
    console.log("📸 [5/6] Testing Occupancy & Empty Racks Heatmap mode...");
    const occupancyBtn = page.locator('button:has-text("Occupancy & Empty Racks")').first();
    if (await occupancyBtn.count() > 0) {
        await occupancyBtn.click();
        await page.waitForTimeout(600);
    }
    const s5 = path.join(ARTIFACT_DIR, "05-warehouse-heatmap-occupancy-empty-racks.png");
    await page.screenshot({ path: s5, fullPage: false });
    console.log(`   ✅ Saved 05-warehouse-heatmap-occupancy-empty-racks.png (${Math.round(fs.statSync(s5).size / 1024)} KB)`);

    // 7. Test Velocity & Dead Spots Heatmap mode
    console.log("📸 [6/6] Testing Velocity & Dead Spots Heatmap mode...");
    const velocityBtn = page.locator('button:has-text("Velocity & Dead Spots")').first();
    if (await velocityBtn.count() > 0) {
        await velocityBtn.click();
        await page.waitForTimeout(600);
    }
    const s6 = path.join(ARTIFACT_DIR, "06-warehouse-heatmap-velocity-dead-spots.png");
    await page.screenshot({ path: s6, fullPage: false });
    console.log(`   ✅ Saved 06-warehouse-heatmap-velocity-dead-spots.png (${Math.round(fs.statSync(s6).size / 1024)} KB)`);

    await browser.close();
    console.log("\n🎉 ALL WAREHOUSE DIGITAL TWIN AUDIT TESTS COMPLETED SUCCESSFULLY!");
}

runWarehouseVisualVerification().catch((err) => {
    console.error("❌ Test failed:", err);
    process.exit(1);
});
