import { chromium } from "@playwright/test";
import path from "path";

const ARTIFACT_DIR = "C:\\Users\\Admin\\.gemini\\antigravity\\brain\\32a777ac-3518-4eaa-a5d5-ee481221323d\\screenshots";

async function main() {
    console.log("🎬 STARTING TRACKS 1-5 PRECISION VISUAL CAPTURE SEQUENCE...");

    const browser = await chromium.launch({
        executablePath: "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
        headless: true,
    });

    const context = await browser.newContext({
        viewport: { width: 1440, height: 900 },
        deviceScaleFactor: 1.5,
    });

    const page = await context.newPage();

    // 1. Log in as Super Admin
    console.log("🔐 Logging in as Super Admin (admin@e3rentals.com)...");
    await page.goto("http://localhost:5001/login", { waitUntil: "domcontentloaded" });
    await page.fill("#email", "admin@e3rentals.com");
    await page.fill("#password", "adminpassword123");
    await page.click('button[type="submit"]');
    await page.waitForURL((url) => !url.pathname.includes("/login"), { timeout: 15000 });
    console.log("✅ Logged in successfully!");

    // -------------------------------------------------------------
    // Screen 1: Track 1 - Live Driver GPS Telemetry & Qatar Logistics Map Radar
    // -------------------------------------------------------------
    console.log("\n📸 Capturing: Track 1 Live Driver GPS Telemetry & Radar (?tab=radar)...");
    await page.goto("http://localhost:5001/dashboard/warehouse/dispatch?tab=radar", { waitUntil: "domcontentloaded" });
    await page.waitForSelector('text=QATAR LOGISTICS RADAR', { timeout: 15000 });
    await page.waitForTimeout(2000);
    await page.screenshot({
        path: path.join(ARTIFACT_DIR, "08-track1-live-gps-radar.png"),
        fullPage: false,
    });
    console.log("  ✅ Saved 08-track1-live-gps-radar.png");

    // -------------------------------------------------------------
    // Screen 2: Track 2 - Master Flight Case & Kit Sub-Assemblies
    // -------------------------------------------------------------
    console.log("\n📸 Capturing: Track 2 Master Flight Cases & Kit Assemblies (?tab=flight_cases)...");
    await page.goto("http://localhost:5001/dashboard/warehouse/dispatch?tab=flight_cases", { waitUntil: "domcontentloaded" });
    await page.waitForSelector('text=MASTER FLIGHT CASES & KIT ASSEMBLIES', { timeout: 15000 });
    await page.waitForTimeout(2000);
    await page.screenshot({
        path: path.join(ARTIFACT_DIR, "09-track2-flight-case-assemblies.png"),
        fullPage: false,
    });
    console.log("  ✅ Saved 09-track2-flight-case-assemblies.png");

    // -------------------------------------------------------------
    // Screen 3: Track 3 - Technical Crew & Event Labor Scheduling Cockpit
    // -------------------------------------------------------------
    console.log("\n📸 Capturing: Track 3 Crew Scheduling & Call Sheet in Booking Detail...");
    await page.goto("http://localhost:5001/admin/bookings/82e6e7d0-caaf-440b-96ca-3f62eaa05e63", { waitUntil: "domcontentloaded" });
    await page.waitForSelector('text=TECHNICAL CREW & EVENT LABOR SCHEDULING', { timeout: 20000 });
    const crewSection = page.locator('text=TECHNICAL CREW & EVENT LABOR SCHEDULING');
    await crewSection.scrollIntoViewIfNeeded();
    await page.waitForTimeout(1500);
    await page.screenshot({
        path: path.join(ARTIFACT_DIR, "10-track3-crew-scheduling-cockpit.png"),
        fullPage: false,
    });
    console.log("  ✅ Saved 10-track3-crew-scheduling-cockpit.png");

    // -------------------------------------------------------------
    // Screen 4: Track 4 - Predictive Utilization & Executive RevPAR Analytics
    // -------------------------------------------------------------
    console.log("\n📸 Capturing: Track 4 Predictive Fleet & RevPAR Cockpit...");
    await page.goto("http://localhost:5001/admin/analytics", { waitUntil: "domcontentloaded" });
    await page.waitForSelector('button:has-text("Predictive Fleet & RevPAR")', { timeout: 20000 });
    const predictiveTab = page.locator('button:has-text("Predictive Fleet & RevPAR")');
    await predictiveTab.click();
    await page.waitForSelector('text=Executive RevPAR & Predictive Fleet Shortage Engine', { timeout: 20000 });
    await page.waitForTimeout(2000);
    await page.screenshot({
        path: path.join(ARTIFACT_DIR, "11-track4-predictive-utilization-revpar.png"),
        fullPage: false,
    });
    console.log("  ✅ Saved 11-track4-predictive-utilization-revpar.png");

    // -------------------------------------------------------------
    // Screen 5: Track 5 - White-Label Client Interactive Deal Room
    // -------------------------------------------------------------
    console.log("\n📸 Capturing: Track 5 White-Label Client Deal Room Portal...");
    await page.goto("http://localhost:5001/deal-room/e3-uzair-malik-857d5a", { waitUntil: "domcontentloaded" });
    await page.waitForSelector('text=Official Technical Specification & Production Quotation', { timeout: 20000 });
    await page.waitForTimeout(2000);
    await page.screenshot({
        path: path.join(ARTIFACT_DIR, "12-track5-interactive-deal-room.png"),
        fullPage: false,
    });
    console.log("  ✅ Saved 12-track5-interactive-deal-room.png");

    await browser.close();
    console.log("\n✨ ALL 5 TRACK SCREENS SUCCESSFULLY CAPTURED!");
}

main()
    .then(() => process.exit(0))
    .catch((err) => {
        console.error("Capture Error:", err);
        process.exit(1);
    });
