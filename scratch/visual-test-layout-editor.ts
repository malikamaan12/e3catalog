import { chromium } from "@playwright/test";
import path from "path";
import fs from "fs";

const ARTIFACT_DIR = "C:\\Users\\Admin\\.gemini\\antigravity\\brain\\97661fef-ac02-42fb-96d2-30200aedba4c\\screenshots\\visual-editor";
const BASE_URL = "http://localhost:5001";
const WAREHOUSE_ID = "9300db24-4419-4722-944c-fbb7c6bb2770";

async function runVisualEditorAudit() {
    console.log("===============================================================================");
    console.log("🎬 STARTING WAREHOUSE PASSAGES & VISUAL CANVAS EDITOR AUDIT");
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
    console.log("✅ Authenticated!\n");

    // 2. Navigate to Warehouse Layout
    console.log("📸 [1/5] Navigating to Layout Studio and toggling Modify Layout...");
    await page.goto(`${BASE_URL}/admin/warehouses/${WAREHOUSE_ID}/layout`, { waitUntil: "domcontentloaded" });
    await page.waitForSelector("#modify-layout-btn", { timeout: 15000 });
    await page.click("#modify-layout-btn");
    await page.waitForTimeout(2500);

    // Capture main visual editor with canvas, rulers, and palette (including passage cards)
    const p1 = path.join(ARTIFACT_DIR, "01-visual-editor-canvas-overview.png");
    await page.screenshot({ path: p1, fullPage: false });
    console.log(`   ✅ Saved 01-visual-editor-canvas-overview.png (${Math.round(fs.statSync(p1).size / 1024)} KB)`);

    // 3. Select a Passage directly or via Elements tab
    console.log("📸 [2/5] Selecting a transit passage to inspect live handles and dimension badge...");
    // Let's click directly on the passage text or rect on canvas
    const passageText = page.locator('text=Main Arterial Forklift Highway').first();
    if (await passageText.count() > 0) {
        await passageText.click({ force: true });
    } else {
        // Fallback to elements list
        const itemsTab = page.locator('button:has-text("Elements (")').first();
        if (await itemsTab.count() > 0) {
            await itemsTab.click();
            await page.waitForTimeout(500);
            await page.click('button:has-text("Passages")');
            await page.click('text=Main Arterial Forklift Highway');
        }
    }
    await page.waitForTimeout(1000);
    const p2 = path.join(ARTIFACT_DIR, "05-passage-selected-with-inspector.png");
    await page.screenshot({ path: p2, fullPage: false });
    console.log(`   ✅ Saved 05-passage-selected-with-inspector.png (${Math.round(fs.statSync(p2).size / 1024)} KB)`);

    // 4. Test Passage Rotation or Quick Align
    console.log("📸 [3/5] Testing Passage alignment preset...");
    const centerBtn = page.locator('button:has-text("Center X")').first();
    if (await centerBtn.count() > 0 && await centerBtn.isEnabled()) {
        await centerBtn.click();
        await page.waitForTimeout(1000);
    }
    const p3 = path.join(ARTIFACT_DIR, "06-passage-aligned-canvas.png");
    await page.screenshot({ path: p3, fullPage: false });
    console.log(`   ✅ Saved 06-passage-aligned-canvas.png (${Math.round(fs.statSync(p3).size / 1024)} KB)`);

    // 5. Check Placed Elements Tab with "Passages" filter
    console.log("📸 [4/5] Switching to Placed Elements List and filtering by Passages...");
    const elementsTabBtn = page.locator('button:has-text("Placed (")').first();
    if (await elementsTabBtn.count() > 0) {
        await elementsTabBtn.click();
        await page.waitForTimeout(600);
        const passagesFilterBtn = page.locator('button:has-text("Passages")').first();
        if (await passagesFilterBtn.count() > 0) {
            await passagesFilterBtn.click();
            await page.waitForTimeout(600);
        }
    }
    const p4 = path.join(ARTIFACT_DIR, "07-placed-passages-list-view.png");
    await page.screenshot({ path: p4, fullPage: false });
    console.log(`   ✅ Saved 07-placed-passages-list-view.png (${Math.round(fs.statSync(p4).size / 1024)} KB)`);

    // 6. Test Add New Passage from Palette
    console.log("📸 [5/5] Returning to Palette Tab and clicking to add a Cross-Aisle Connector...");
    const paletteTabBtn = page.locator('button:has-text("Add Items")').first();
    if (await paletteTabBtn.count() > 0) {
        await paletteTabBtn.click();
        await page.waitForTimeout(600);
        const addCrossAisleBtn = page.locator('button:has-text("Cross-Aisle Connector")').first();
        if (await addCrossAisleBtn.count() > 0) {
            await addCrossAisleBtn.click();
            await page.waitForTimeout(1000);
        }
    }
    const p5 = path.join(ARTIFACT_DIR, "08-new-cross-aisle-added.png");
    await page.screenshot({ path: p5, fullPage: false });
    console.log(`   ✅ Saved 08-new-cross-aisle-added.png (${Math.round(fs.statSync(p5).size / 1024)} KB)`);

    await browser.close();
    console.log("\n🎉 PASSAGES & VISUAL AUDIT COMPLETE! All screenshots captured successfully.");
}

runVisualEditorAudit().catch((err) => {
    console.error("FATAL ERROR:", err);
    process.exit(1);
});
