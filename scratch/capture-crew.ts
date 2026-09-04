import { chromium } from "@playwright/test";
import path from "path";

const ARTIFACT_DIR = "C:\\Users\\Admin\\.gemini\\antigravity\\brain\\32a777ac-3518-4eaa-a5d5-ee481221323d\\screenshots";

async function main() {
    const browser = await chromium.launch({
        executablePath: "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
        headless: true,
    });
    const context = await browser.newContext({
        viewport: { width: 1440, height: 900 },
        deviceScaleFactor: 1.5,
    });
    const page = await context.newPage();

    await page.goto("http://localhost:5001/login", { waitUntil: "domcontentloaded" });
    await page.fill("#email", "admin@e3rentals.com");
    await page.fill("#password", "adminpassword123");
    await page.click('button[type="submit"]');
    await page.waitForURL((url) => !url.pathname.includes("/login"), { timeout: 15000 });

    await page.goto("http://localhost:5001/admin/bookings/82e6e7d0-caaf-440b-96ca-3f62eaa05e63", { waitUntil: "domcontentloaded" });
    await page.waitForSelector('text=TECHNICAL CREW & EVENT LABOR SCHEDULING', { timeout: 20000 });
    
    await page.evaluate(() => window.scrollTo(0, 650));
    await page.waitForTimeout(1000);

    await page.screenshot({
        path: path.join(ARTIFACT_DIR, "10-track3-crew-scheduling-cockpit.png"),
        fullPage: false,
    });
    console.log("✅ Re-captured 10-track3-crew-scheduling-cockpit.png with window.scrollTo!");

    await browser.close();
}

main().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
