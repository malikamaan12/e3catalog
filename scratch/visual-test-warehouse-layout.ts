import { chromium } from "@playwright/test";
import path from "path";
import fs from "fs";

const ARTIFACT_DIR = "C:\\Users\\Admin\\.gemini\\antigravity\\brain\\97661fef-ac02-42fb-96d2-30200aedba4c\\screenshots\\layout-digital-twin";
const BASE_URL = "http://localhost:5001";
const WAREHOUSE_ID = "9300db24-4419-4722-944c-fbb7c6bb2770"; // Industrial Area 01

async function runVisualWarehouseLayoutTest() {
    console.log("===============================================================================");
    console.log("🎬 STARTING WAREHOUSE DIGITAL TWIN & VISUAL LAYOUT PLAYWRIGHT AUDIT");
    console.log("===============================================================================\n");

    if (!fs.existsSync(ARTIFACT_DIR)) {
        fs.mkdirSync(ARTIFACT_DIR, { recursive: true });
    }

    const browser = await chromium.launch({
        executablePath: "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
        headless: true,
    });

    const context = await browser.newContext({
        viewport: { width: 1600, height: 1000 },
        deviceScaleFactor: 1.0,
    });

    const page = await context.newPage();
    page.on("pageerror", (err) => console.error("🛑 [BROWSER PAGE ERROR]:", err));
    page.on("console", (msg) => {
        if (msg.type() === "error") console.error("⚠️ [BROWSER CONSOLE ERROR]:", msg.text());
    });

    // 1. Authenticate as Super Admin
    console.log("🔐 Authenticating session (admin@e3rentals.com)...");
    await page.goto(`${BASE_URL}/login`, { waitUntil: "domcontentloaded" });
    await page.fill("#email", "admin@e3rentals.com");
    await page.fill("#password", "adminpassword123");
    await page.click('button[type="submit"]');
    await page.waitForURL((url) => !url.pathname.includes("/login"), { timeout: 15000 });
    console.log("✅ Authenticated successfully!\n");

    // 2. Capture Admin Warehouses Page (User's screenshot page with new Floor Plan buttons)
    console.log("📸 [1/8] Capturing Admin Warehouses Cards with Floor Plan triggers...");
    await page.goto(`${BASE_URL}/admin/warehouses`, { waitUntil: "domcontentloaded" });
    await page.waitForSelector("text=Warehouse Management", { timeout: 15000 });
    await page.waitForTimeout(2000);
    const p1 = path.join(ARTIFACT_DIR, "01-admin-warehouses-with-floorplan-buttons.png");
    await page.screenshot({ path: p1, fullPage: false });
    console.log(`   ✅ Saved 01-admin-warehouses-with-floorplan-buttons.png (${Math.round(fs.statSync(p1).size / 1024)} KB)`);

    // 3. Capture Dedicated 2D Floor Plan & Digital Twin Studio
    console.log("📸 [2/8] Capturing Digital Twin 2D Floor Plan...");
    await page.goto(`${BASE_URL}/admin/warehouses/${WAREHOUSE_ID}/layout`, { waitUntil: "domcontentloaded" });
    await page.waitForSelector("text=Industrial Area 01", { timeout: 15000 });
    await page.waitForTimeout(2500);
    const p2 = path.join(ARTIFACT_DIR, "02-digital-twin-2d-floorplan.png");
    await page.screenshot({ path: p2, fullPage: false });
    console.log(`   ✅ Saved 02-digital-twin-2d-floorplan.png (${Math.round(fs.statSync(p2).size / 1024)} KB)`);

    // 4. Capture Occupancy & Empty Racks Heatmap
    console.log("📸 [3/8] Capturing Occupancy & Empty Racks Heatmap...");
    await page.click("text=Occupancy & Empty Racks");
    await page.waitForTimeout(1500);
    const p3 = path.join(ARTIFACT_DIR, "03-digital-twin-occupancy-empty-racks.png");
    await page.screenshot({ path: p3, fullPage: false });
    console.log(`   ✅ Saved 03-digital-twin-occupancy-empty-racks.png (${Math.round(fs.statSync(p3).size / 1024)} KB)`);

    // 5. Capture Velocity & Dead Spots Heatmap
    console.log("📸 [4/8] Capturing Velocity & Dead Spots Heatmap...");
    await page.click("text=Velocity & Dead Spots");
    await page.waitForTimeout(1500);
    const p4 = path.join(ARTIFACT_DIR, "04-digital-twin-velocity-dead-spots.png");
    await page.screenshot({ path: p4, fullPage: false });
    console.log(`   ✅ Saved 04-digital-twin-velocity-dead-spots.png (${Math.round(fs.statSync(p4).size / 1024)} KB)`);

    // 6. Click on a Rack to open Rack Detail Drawer with vertical tiers
    console.log("📸 [5/8] Capturing Rack Detail Drawer with Shelf Tiers...");
    await page.click("text=RCK-AUD-01");
    await page.waitForSelector("text=Vertical Shelf Levels", { timeout: 10000 });
    await page.waitForTimeout(1500);
    const p5 = path.join(ARTIFACT_DIR, "05-rack-detail-drawer-tiers.png");
    await page.screenshot({ path: p5, fullPage: false });
    console.log(`   ✅ Saved 05-rack-detail-drawer-tiers.png (${Math.round(fs.statSync(p5).size / 1024)} KB)`);

    // Close drawer
    const closeBtn = page.locator('#close-rack-drawer-btn');
    if (await closeBtn.isVisible()) {
        await closeBtn.click({ force: true });
        await page.waitForTimeout(1000);
    }

    // 7. Perform Physical Item Locator Search
    console.log("📸 [6/8] Capturing Physical Item Locator & Target Beacon...");
    const searchInput = page.locator('input[placeholder*="Search asset tag"]');
    await searchInput.fill("E3-ENT");
    await page.waitForTimeout(1500);

    const firstMatch = page.locator("text=E3-ENT-001-003").first();
    if (await firstMatch.isVisible()) {
        await firstMatch.click({ force: true });
        await page.waitForTimeout(2000);
    }
    const p6 = path.join(ARTIFACT_DIR, "06-item-locator-illuminated-beacon.png");
    await page.screenshot({ path: p6, fullPage: false });
    console.log(`   ✅ Saved 06-item-locator-illuminated-beacon.png (${Math.round(fs.statSync(p6).size / 1024)} KB)`);

    // Ensure drawer is closed and clear located item
    const drawerCloseBtn = page.locator('#close-rack-drawer-btn');
    if (await drawerCloseBtn.isVisible()) {
        await drawerCloseBtn.click({ force: true });
        await page.waitForTimeout(800);
    }
    const dismissBtn = page.locator('#dismiss-located-beacon-btn');
    if (await dismissBtn.isVisible()) {
        await dismissBtn.click({ force: true });
        await page.waitForTimeout(800);
    }

    // 8. Capture Layout Studio Editor Mode
    console.log("📸 [7/8] Capturing Layout Studio Editor Mode...");
    await page.locator("#modify-layout-btn").scrollIntoViewIfNeeded();
    await page.click("#modify-layout-btn", { force: true });
    await page.waitForSelector("text=Layout Studio", { timeout: 15000 });
    await page.waitForTimeout(1500);
    const p7 = path.join(ARTIFACT_DIR, "07-layout-studio-editor-mode.png");
    await page.screenshot({ path: p7, fullPage: false });
    console.log(`   ✅ Saved 07-layout-studio-editor-mode.png (${Math.round(fs.statSync(p7).size / 1024)} KB)`);

    // Exit editor mode
    const cancelBtn = page.locator('button:has-text("Cancel")');
    if (await cancelBtn.isVisible()) {
        await cancelBtn.click({ force: true });
        await page.waitForTimeout(1200);
    }

    // 9. Capture 3D Isometric View
    console.log("📸 [8/8] Capturing 3D Isometric Digital Twin View...");
    const isoBtn = page.locator('#toggle-3d-view-btn');
    await isoBtn.scrollIntoViewIfNeeded();
    await isoBtn.click({ force: true });
    await page.waitForTimeout(2000);
    const p8 = path.join(ARTIFACT_DIR, "08-digital-twin-3d-isometric-view.png");
    await page.screenshot({ path: p8, fullPage: false });
    console.log(`   ✅ Saved 08-digital-twin-3d-isometric-view.png (${Math.round(fs.statSync(p8).size / 1024)} KB)`);

    await browser.close();
    console.log("\n===============================================================================");
    console.log("🎉 ALL WAREHOUSE DIGITAL TWIN VISUAL AUDITS COMPLETED SUCCESSFULLY!");
    console.log("===============================================================================");
}

runVisualWarehouseLayoutTest()
    .then(() => process.exit(0))
    .catch((err) => {
        console.error("❌ Visual audit execution failure:", err);
        process.exit(1);
    });
