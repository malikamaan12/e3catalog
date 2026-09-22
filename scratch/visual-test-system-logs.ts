import { chromium } from "@playwright/test";
import path from "path";
import fs from "fs";

const ARTIFACT_DIR = "C:\\Users\\Admin\\.gemini\\antigravity\\brain\\97661fef-ac02-42fb-96d2-30200aedba4c\\screenshots\\system-logs";
const BASE_URL = "http://localhost:5001";

async function runSystemLogsAudit() {
    console.log("===============================================================================");
    console.log("🎬 STARTING SYSTEM MANAGEMENT LOGS AUDIT");
    console.log("===============================================================================\n");

    if (!fs.existsSync(ARTIFACT_DIR)) {
        fs.mkdirSync(ARTIFACT_DIR, { recursive: true });
    }

    const browser = await chromium.launch({
        executablePath: "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
        headless: true,
    });

    try {
        const context = await browser.newContext({
            viewport: { width: 1440, height: 900 },
            deviceScaleFactor: 1.0,
        });
        const page = await context.newPage();

        let clientException: string | null = null;
        page.on("pageerror", (err) => {
            console.error("🛑 [BROWSER UNCAUGHT ERROR]:", err);
            clientException = err.message;
        });

        // 1. Authenticate as Super Admin
        console.log("🔐 Logging in as Super Admin (superadmin@e3rentals.com)...");
        await page.goto(`${BASE_URL}/login`, { waitUntil: "domcontentloaded" });
        await page.fill("#email", "superadmin@e3rentals.com");
        await page.fill("#password", "Password123!");
        await page.click('button[type="submit"]');
        await page.waitForURL((url) => !url.pathname.includes("/login"), { timeout: 15000 });
        console.log("✅ Authenticated!\n");

        // 2. Navigate to System Management (/admin/super)
        console.log("📸 Navigating to System Management (/admin/super)...");
        await page.goto(`${BASE_URL}/admin/super`, { waitUntil: "domcontentloaded" });
        await page.waitForTimeout(2500);

        const p1 = path.join(ARTIFACT_DIR, "01-system-management-users-tab.png");
        await page.screenshot({ path: p1, fullPage: false });
        console.log(`   ✅ Saved 01-system-management-users-tab.png`);

        // 3. Click "Logs" tab
        console.log("🖱️ Clicking 'Logs' tab in System Management...");
        const logsTabBtn = page.locator('button:has-text("Logs")');
        if (await logsTabBtn.count() > 0) {
            await logsTabBtn.first().click();
            await page.waitForTimeout(2500);

            // Verify no error boundary
            const errorBoundaryText = await page.locator('text="Something went wrong"').count();
            if (errorBoundaryText > 0 || clientException) {
                throw new Error(`Client-side exception occurred! Exception: ${clientException}`);
            }

            // Check if log rows rendered
            const logRows = page.locator('table tbody tr');
            const rowCount = await logRows.count();
            console.log(`   📊 Found ${rowCount} log table rows rendered!`);

            const p2 = path.join(ARTIFACT_DIR, "02-system-management-logs-tab.png");
            await page.screenshot({ path: p2, fullPage: false });
            console.log(`   ✅ Saved 02-system-management-logs-tab.png`);
        } else {
            throw new Error("Logs tab button not found in System Management.");
        }

        console.log("\n===============================================================================");
        console.log("🎉 SYSTEM MANAGEMENT LOGS VERIFIED WITH ZERO ERRORS!");
        console.log("===============================================================================");
    } finally {
        await browser.close();
    }
}

runSystemLogsAudit().catch((err) => {
    console.error("❌ Audit failed:", err);
    process.exit(1);
});
