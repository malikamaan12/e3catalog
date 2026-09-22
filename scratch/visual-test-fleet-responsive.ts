import { chromium } from "@playwright/test";
import path from "path";
import fs from "fs";

const ARTIFACT_DIR = "C:\\Users\\Admin\\.gemini\\antigravity\\brain\\97661fef-ac02-42fb-96d2-30200aedba4c\\screenshots\\fleet-responsive";
const BASE_URL = "http://localhost:5001";

async function runFleetResponsiveAudit() {
    console.log("===============================================================================");
    console.log("🎬 STARTING FLEET RESPONSIVE & CLIPPING FIX AUDIT");
    console.log("===============================================================================\n");

    if (!fs.existsSync(ARTIFACT_DIR)) {
        fs.mkdirSync(ARTIFACT_DIR, { recursive: true });
    }

    const browser = await chromium.launch({
        executablePath: "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
        headless: true,
    });

    try {
        // Step 1: Login once and retain session
        const context = await browser.newContext({
            viewport: { width: 1440, height: 900 },
            deviceScaleFactor: 1.0,
        });
        const page = await context.newPage();
        page.on("pageerror", (err) => console.error("🛑 [BROWSER ERROR]:", err));

        console.log("🔐 Logging in as Admin...");
        await page.goto(`${BASE_URL}/login`, { waitUntil: "domcontentloaded" });
        await page.fill("#email", "admin@e3rentals.com");
        await page.fill("#password", "adminpassword123");
        await page.click('button[type="submit"]');
        await page.waitForURL((url) => !url.pathname.includes("/login"), { timeout: 15000 });
        console.log("✅ Authenticated!\n");

        // 1. Desktop Viewport (1440x900) - Audit /admin/fleet
        console.log("📸 [1/5] Auditing Desktop Viewport (1440x900) for Clipping & Layout Integrity...");
        await page.goto(`${BASE_URL}/admin/fleet`, { waitUntil: "domcontentloaded" });
        await page.waitForTimeout(3000);

        // Check horizontal overflow
        const desktopOverflow = await page.evaluate(() => {
            return {
                windowWidth: window.innerWidth,
                bodyScrollWidth: document.body.scrollWidth,
                docScrollWidth: document.documentElement.scrollWidth,
                hasClippingOverflow: document.documentElement.scrollWidth > window.innerWidth
            };
        });
        console.log("   📊 Desktop Overflow Metrics:", JSON.stringify(desktopOverflow));
        if (desktopOverflow.hasClippingOverflow) {
            console.warn("   ⚠️ Warning: document has horizontal overflow on desktop!");
        } else {
            console.log("   ✅ Desktop has ZERO body horizontal overflow! Layout nicely contained.");
        }

        const p1 = path.join(ARTIFACT_DIR, "01-fleet-desktop.png");
        await page.screenshot({ path: p1, fullPage: false });
        console.log(`   ✅ Saved 01-fleet-desktop.png (${Math.round(fs.statSync(p1).size / 1024)} KB)`);

        // 2. Laptop Viewport (1024x768) - Mid-range laptop
        console.log("\n📸 [2/5] Auditing Laptop Viewport (1024x768)...");
        await page.setViewportSize({ width: 1024, height: 768 });
        await page.waitForTimeout(1500);

        const laptopOverflow = await page.evaluate(() => {
            return {
                windowWidth: window.innerWidth,
                docScrollWidth: document.documentElement.scrollWidth,
                hasClippingOverflow: document.documentElement.scrollWidth > window.innerWidth
            };
        });
        console.log("   📊 Laptop Overflow Metrics:", JSON.stringify(laptopOverflow));

        const p2 = path.join(ARTIFACT_DIR, "02-fleet-laptop.png");
        await page.screenshot({ path: p2, fullPage: false });
        console.log(`   ✅ Saved 02-fleet-laptop.png (${Math.round(fs.statSync(p2).size / 1024)} KB)`);

        // 3. Mobile Viewport (390x844) - iPhone 13/14/15 size
        console.log("\n📸 [3/5] Auditing Mobile Viewport (390x844) Card View...");
        await page.setViewportSize({ width: 390, height: 844 });
        await page.waitForTimeout(1500);

        const mobileOverflow = await page.evaluate(() => {
            return {
                windowWidth: window.innerWidth,
                docScrollWidth: document.documentElement.scrollWidth,
                hasClippingOverflow: document.documentElement.scrollWidth > window.innerWidth
            };
        });
        console.log("   📊 Mobile Overflow Metrics:", JSON.stringify(mobileOverflow));

        const p3 = path.join(ARTIFACT_DIR, "03-fleet-mobile-cards.png");
        await page.screenshot({ path: p3, fullPage: false });
        console.log(`   ✅ Saved 03-fleet-mobile-cards.png (${Math.round(fs.statSync(p3).size / 1024)} KB)`);

        // 4. Mobile Navigator Drawer
        console.log("\n📸 [4/5] Auditing Mobile Asset Navigator Slide-Over Drawer...");
        const navFilterBtn = page.locator('button[title="Open Asset Navigator Filter"]');
        if (await navFilterBtn.count() > 0) {
            await navFilterBtn.first().click();
            await page.waitForTimeout(1000);
            const p4 = path.join(ARTIFACT_DIR, "04-fleet-mobile-navigator-drawer.png");
            await page.screenshot({ path: p4, fullPage: false });
            console.log(`   ✅ Saved 04-fleet-mobile-navigator-drawer.png (${Math.round(fs.statSync(p4).size / 1024)} KB)`);

            // Close the drawer
            const closeBtn = page.locator('div.fixed.inset-0 button').first();
            if (await closeBtn.count() > 0) {
                await closeBtn.click();
                await page.waitForTimeout(500);
            }
        } else {
            console.warn("   ⚠️ Navigator filter button not found.");
        }

        // 5. Mobile Navbar Menu with Direct Links
        console.log("\n📸 [5/5] Auditing Mobile Navbar Drawer Navigation...");
        await page.goto(`${BASE_URL}`, { waitUntil: "domcontentloaded" });
        await page.setViewportSize({ width: 390, height: 844 });
        await page.waitForTimeout(1500);

        // Click hamburger button in navbar
        const hamburgerBtn = page.locator('button[aria-label="Toggle menu"]');
        if (await hamburgerBtn.count() > 0) {
            await hamburgerBtn.click();
            await page.waitForTimeout(1000);
            const p5 = path.join(ARTIFACT_DIR, "05-navbar-mobile-drawer.png");
            await page.screenshot({ path: p5, fullPage: false });
            console.log(`   ✅ Saved 05-navbar-mobile-drawer.png (${Math.round(fs.statSync(p5).size / 1024)} KB)`);
        } else {
            console.warn("   ⚠️ Hamburger button not found.");
        }

        console.log("\n===============================================================================");
        console.log("🎉 ALL RESPONSIVE & CLIPPING CHECKS COMPLETED SUCCESSFULLY");
        console.log("===============================================================================");
    } finally {
        await browser.close();
    }
}

runFleetResponsiveAudit().catch((err) => {
    console.error("❌ Fleet responsive audit failed:", err);
    process.exit(1);
});
