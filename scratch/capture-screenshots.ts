import { chromium } from "@playwright/test";
import path from "path";

const ARTIFACT_DIR = "C:\\Users\\Admin\\.gemini\\antigravity\\brain\\32a777ac-3518-4eaa-a5d5-ee481221323d\\screenshots";

async function main() {
    console.log("🎬 STARTING AUTHENTICATED TARGETED CAPTURE SEQUENCE...");

    const browser = await chromium.launch({
        executablePath: "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
        headless: true,
    });

    const context = await browser.newContext({
        viewport: { width: 1440, height: 900 },
        deviceScaleFactor: 1.5,
    });

    const page = await context.newPage();

    // 1. Log in
    console.log("🔐 Logging in as Super Admin (admin@e3rentals.com)...");
    await page.goto("http://localhost:5001/login", { waitUntil: "domcontentloaded" });
    await page.fill("#email", "admin@e3rentals.com");
    await page.fill("#password", "adminpassword123");
    await page.click('button[type="submit"]');
    await page.waitForURL((url) => !url.pathname.includes("/login"), { timeout: 15000 });
    console.log("✅ Logged in successfully!");

    // -------------------------------------------------------------
    // Screen 3: Automated Dispatch Clustering & Multi-Vehicle Route Optimization
    // -------------------------------------------------------------
    console.log("\n📸 Capturing: Automated Dispatch Clustering & Route Optimization (?tab=clusters)...");
    await page.goto("http://localhost:5001/dashboard/warehouse/dispatch?tab=clusters", { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(3000);
    await page.screenshot({
        path: path.join(ARTIFACT_DIR, "03-dispatch-route-optimization.png"),
        fullPage: false,
    });
    console.log("  ✅ Saved 03-dispatch-route-optimization.png");

    // -------------------------------------------------------------
    // Screen 4: Cross-Hire Sub-Rentals Partner Network
    // -------------------------------------------------------------
    console.log("\n📸 Capturing: Cross-Hire Sub-Rentals Partner Network (?tab=cross_hires)...");
    await page.goto("http://localhost:5001/dashboard/warehouse/dispatch?tab=cross_hires", { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(3000);
    await page.screenshot({
        path: path.join(ARTIFACT_DIR, "04-cross-hire-network.png"),
        fullPage: false,
    });
    console.log("  ✅ Saved 04-cross-hire-network.png");

    // -------------------------------------------------------------
    // Screen 6: On-Site QR Digital Passport & Telemetry
    // -------------------------------------------------------------
    console.log("\n📸 Capturing: On-Site QR Digital Passport (/passport/KSL-2696-3-347)...");
    await page.goto("http://localhost:5001/passport/KSL-2696-3-347", { waitUntil: "domcontentloaded" });
    await page.waitForSelector('text=E3 Rentals Digital Passport', { timeout: 12000 });
    await page.waitForTimeout(1000);
    await page.screenshot({
        path: path.join(ARTIFACT_DIR, "06-onsite-asset-passport.png"),
        fullPage: false,
    });
    console.log("  ✅ Saved 06-onsite-asset-passport.png");

    // -------------------------------------------------------------
    // Screen 7: On-Site 1-Click Rental Extension Modal
    // -------------------------------------------------------------
    console.log("\n📸 Capturing: On-Site 1-Click Rental Extension Modal...");
    const extendBtn = page.locator('button:has-text("Extend Rental")');
    if (await extendBtn.count() > 0) {
        await extendBtn.first().click();
        await page.waitForTimeout(1000);
        await page.screenshot({
            path: path.join(ARTIFACT_DIR, "07-onsite-rental-extension-modal.png"),
            fullPage: false,
        });
        console.log("  ✅ Saved 07-onsite-rental-extension-modal.png");
    }

    await browser.close();
    console.log("\n✨ TARGETED CAPTURES COMPLETED!");
}

main()
    .then(() => process.exit(0))
    .catch((err) => {
        console.error("Visual Capture Error:", err);
        process.exit(1);
    });
