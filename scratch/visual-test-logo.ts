import { chromium } from "@playwright/test";
import path from "path";
import fs from "fs";

const ARTIFACT_DIR = "C:\\Users\\Admin\\.gemini\\antigravity\\brain\\97661fef-ac02-42fb-96d2-30200aedba4c\\screenshots\\brand-logo";
const BASE_URL = "http://localhost:5001";

async function runBrandLogoAudit() {
    console.log("===============================================================================");
    console.log("🎬 STARTING AUTHENTIC BRAND LOGO VISUAL AUDIT");
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
        deviceScaleFactor: 1.0,
    });

    const page = await context.newPage();
    page.on("pageerror", (err) => console.error("🛑 [BROWSER ERROR]:", err));

    // 1. Capture Homepage Navbar with Logo
    console.log("📸 [1/4] Auditing Homepage Navbar with Authentic Logo...");
    await page.goto(`${BASE_URL}`, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(2000);
    const p1 = path.join(ARTIFACT_DIR, "01-storefront-navbar-logo.png");
    await page.screenshot({ path: p1, fullPage: false });
    console.log(`   ✅ Saved 01-storefront-navbar-logo.png (${Math.round(fs.statSync(p1).size / 1024)} KB)`);

    // 2. Capture Login Page with Logo
    console.log("📸 [2/4] Auditing Login Page with Authentic Logo...");
    await page.goto(`${BASE_URL}/login`, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(1500);
    const p2 = path.join(ARTIFACT_DIR, "02-login-page-logo.png");
    await page.screenshot({ path: p2, fullPage: false });
    console.log(`   ✅ Saved 02-login-page-logo.png (${Math.round(fs.statSync(p2).size / 1024)} KB)`);

    // 3. Login and Capture Admin / WMS with Logo
    console.log("🔐 Logging in as Admin...");
    await page.fill("#email", "admin@e3rentals.com");
    await page.fill("#password", "adminpassword123");
    await page.click('button[type="submit"]');
    await page.waitForURL((url) => !url.pathname.includes("/login"), { timeout: 15000 });
    console.log("✅ Authenticated!\n");

    console.log("📸 [3/4] Auditing Admin Navigation with Authentic Logo...");
    await page.waitForTimeout(2000);
    const p3 = path.join(ARTIFACT_DIR, "03-admin-dashboard-logo.png");
    await page.screenshot({ path: p3, fullPage: false });
    console.log(`   ✅ Saved 03-admin-dashboard-logo.png (${Math.round(fs.statSync(p3).size / 1024)} KB)`);

    // 4. Capture Catalog Page with Logo
    console.log("📸 [4/4] Auditing Catalog Page with Authentic Logo...");
    await page.goto(`${BASE_URL}/catalog`, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(2000);
    const p4 = path.join(ARTIFACT_DIR, "04-catalog-page-logo.png");
    await page.screenshot({ path: p4, fullPage: false });
    console.log(`   ✅ Saved 04-catalog-page-logo.png (${Math.round(fs.statSync(p4).size / 1024)} KB)`);

    await browser.close();
    console.log("\n🎉 BRAND LOGO AUDIT COMPLETE! All screenshots captured successfully.");
}

runBrandLogoAudit().catch((err) => {
    console.error("FATAL ERROR:", err);
    process.exit(1);
});
