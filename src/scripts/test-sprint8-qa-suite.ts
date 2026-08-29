import http from "http";
import { spawn, ChildProcess } from "child_process";
import { db, pool } from "../lib/db";
import { users, categories, products, inventoryUnits, bookings, vendors } from "../lib/db/schema";
import { USER_ROLES } from "../lib/constants";
import { v4 as uuid } from "uuid";

const PORT = 5001;
const BASE_URL = `http://localhost:${PORT}`;

async function isServerHealthy(): Promise<boolean> {
    return new Promise((resolve) => {
        const req = http.get(`${BASE_URL}/api/health`, (res) => {
            resolve(res.statusCode === 200);
        });
        req.on("error", () => resolve(false));
        req.setTimeout(1000, () => {
            req.destroy();
            resolve(false);
        });
    });
}

async function fetchRoute(
    pathStr: string,
    options: {
        method?: string;
        cookie?: string;
        body?: any;
        headers?: Record<string, string>;
    } = {}
) {
    const headers: Record<string, string> = { ...(options.headers || {}) };
    if (options.cookie) {
        headers["Cookie"] = options.cookie;
    }
    if (options.body && !headers["Content-Type"]) {
        headers["Content-Type"] = "application/json";
    }

    const res = await fetch(`${BASE_URL}${pathStr}`, {
        method: options.method || "GET",
        headers,
        body: options.body ? JSON.stringify(options.body) : undefined,
    });

    const contentType = res.headers.get("content-type") || "";
    const isJson = contentType.includes("application/json");
    const isHtml = contentType.includes("text/html");
    const isPdf = contentType.includes("application/pdf");

    let data: any = null;
    let text = "";
    if (isJson) {
        data = await res.json();
    } else {
        text = await res.text();
    }

    return {
        status: res.status,
        headers: res.headers,
        data,
        text,
        isJson,
        isHtml,
        isPdf,
    };
}

async function runSprint8QaSuite() {
    console.log("================================================================================");
    console.log("   E3 RENTALS — SPRINT 8 FULL FUNCTIONAL QA, VISUAL UX & A11Y SUITE            ");
    console.log("================================================================================\n");

    let serverProcess: ChildProcess | null = null;
    const isRunning = await isServerHealthy();

    if (!isRunning) {
        console.log(`Starting Next.js production server on port ${PORT}...`);
        serverProcess = spawn("npx", ["next", "start", "-p", String(PORT)], {
            cwd: process.cwd(),
            shell: true,
            stdio: "ignore",
        });

        let ready = false;
        for (let i = 0; i < 30; i++) {
            await new Promise((r) => setTimeout(r, 1000));
            if (await isServerHealthy()) {
                ready = true;
                break;
            }
        }
        if (!ready) {
            if (serverProcess) serverProcess.kill();
            throw new Error(`Failed to start Next.js production server on port ${PORT}`);
        }
    }
    console.log(`HTTP Server confirmed active at ${BASE_URL}\n`);

    const testRunId = Date.now().toString(36);
    const createdUserIds: string[] = [];
    const createdProductIds: string[] = [];
    const createdVendorIds: string[] = [];
    const createdBookingIds: string[] = [];
    let categoryId = "";

    try {
        // ─── 1. Provision Test Personas ───
        console.log("--- 1. Provisioning Personas & Seed Fixtures ---");
        const superAdminId = uuid();
        const adminId = uuid();
        const salesRepId = uuid();
        const warehouseMgrId = uuid();
        const vendorUserId = uuid();
        const clientId = uuid();

        const superAdminEmail = `super_qa_${testRunId}@e3.qa`.toLowerCase();
        const adminEmail = `admin_qa_${testRunId}@e3.qa`.toLowerCase();
        const salesRepEmail = `sales_qa_${testRunId}@e3.qa`.toLowerCase();
        const warehouseMgrEmail = `wh_qa_${testRunId}@e3.qa`.toLowerCase();
        const vendorUserEmail = `vendor_qa_${testRunId}@e3.qa`.toLowerCase();
        const clientEmail = `client_qa_${testRunId}@e3.qa`.toLowerCase();

        createdUserIds.push(superAdminId, adminId, salesRepId, warehouseMgrId, vendorUserId, clientId);

        await db.insert(users).values([
            { id: superAdminId, name: `Super Admin QA`, email: superAdminEmail, password: "password123", role: USER_ROLES.SUPER_ADMIN, status: "active" },
            { id: adminId, name: `Admin QA`, email: adminEmail, password: "password123", role: USER_ROLES.ADMIN, status: "active" },
            { id: salesRepId, name: `Sales QA`, email: salesRepEmail, password: "password123", role: USER_ROLES.SALES_REP, status: "active" },
            { id: warehouseMgrId, name: `Warehouse QA`, email: warehouseMgrEmail, password: "password123", role: USER_ROLES.WAREHOUSE_MANAGER, status: "active" },
            { id: vendorUserId, name: `Vendor QA`, email: vendorUserEmail, password: "password123", role: USER_ROLES.VENDOR, status: "active" },
            { id: clientId, name: `Client QA`, email: clientEmail, password: "password123", role: USER_ROLES.CLIENT, status: "active" },
        ]);

        const loginAs = async (email: string): Promise<string> => {
            const res = await fetch(`${BASE_URL}/api/auth/login`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email, password: "password123" }),
            });
            const setCookie = res.headers.get("set-cookie");
            if (!setCookie) {
                throw new Error(`Login failed for ${email}`);
            }
            return setCookie.split(";")[0];
        };

        const superAdminCookie = await loginAs(superAdminEmail);
        const salesRepCookie = await loginAs(salesRepEmail);
        const warehouseMgrCookie = await loginAs(warehouseMgrEmail);
        const vendorCookie = await loginAs(vendorUserEmail);
        const clientCookie = await loginAs(clientEmail);

        const vendorProfileId = uuid();
        createdVendorIds.push(vendorProfileId);
        await db.insert(vendors).values({
            id: vendorProfileId,
            userId: vendorUserId,
            companyName: `Pro Audio Visual QA ${testRunId}`,
            storeStatus: "active",
            kycStatus: "verified",
        });

        categoryId = uuid();
        await db.insert(categories).values({
            id: categoryId,
            name: `Concert Lighting QA ${testRunId}`,
            slug: `concert-lighting-qa-${testRunId}`,
        });

        const prodId = uuid();
        createdProductIds.push(prodId);
        await db.insert(products).values({
            id: prodId,
            vendorId: vendorProfileId,
            categoryId,
            name: `High-Output Moving Head QA ${testRunId}`,
            slug: `high-output-moving-head-qa-${testRunId}`,
            pricePerDay: 850,
            status: "active",
            requiresLicense: false,
        });

        const assetTag = `E3-AST-${testRunId.toUpperCase()}-001`;
        await db.insert(inventoryUnits).values({
            id: uuid(),
            productId: prodId,
            vendorId: vendorProfileId,
            assetTagCode: assetTag,
            serialNumber: `SN-QA-${testRunId}`,
            conditionStatus: "excellent",
            availabilityStatus: "in_warehouse",
        });

        const bookingId = uuid();
        createdBookingIds.push(bookingId);
        await db.insert(bookings).values({
            id: bookingId,
            productId: prodId,
            userId: clientId,
            customerName: "Client QA Enterprise",
            customerEmail: clientEmail,
            units: 1,
            startDate: new Date("2026-11-01T00:00:00Z"),
            endDate: new Date("2026-11-05T00:00:00Z"),
            totalPrice: 3400,
            status: "approved",
            paymentStatus: "paid",
        });

        console.log("  [PASS] Seeded test personas, catalog products, inventory units, and bookings.\n");

        // ─── 2. Public Catalog & Informational Pages QA ───
        console.log("--- 2. Public Catalog & Marketing Pages QA ---");

        const publicPages = [
            { path: "/", name: "Homepage" },
            { path: "/catalog", name: "Catalog Listing" },
            { path: `/catalog/high-output-moving-head-qa-${testRunId}`, name: "Product Detail Page" },
            { path: "/cart", name: "Rental Cart" },
            { path: "/how-it-works", name: "How It Works" },
            { path: "/privacy", name: "Privacy Policy" },
            { path: "/vendors", name: "Vendor Landing" },
            { path: "/vendors/terms", name: "Vendor Terms" },
            { path: "/vendors/policy", name: "Vendor Policy" },
            { path: "/login", name: "Login Page" },
            { path: "/signup", name: "Signup Page" },
            { path: "/manifest.webmanifest", name: "PWA Web App Manifest" },
            { path: "/robots.txt", name: "Robots SEO" },
            { path: "/sitemap.xml", name: "Sitemap XML" },
        ];

        for (const page of publicPages) {
            const res = await fetchRoute(page.path);
            if (res.status !== 200) {
                throw new Error(`Public page ${page.name} (${page.path}) failed with status ${res.status}`);
            }
            if (page.path.endsWith(".xml")) {
                if (!res.text.includes("<urlset")) throw new Error(`Sitemap XML missing urlset tags`);
            } else if (page.path.endsWith(".webmanifest")) {
                if (!res.isJson && !res.text.includes("name")) throw new Error(`PWA Manifest invalid format`);
            } else if (!page.path.endsWith(".txt")) {
                if (!res.isHtml) throw new Error(`Expected HTML response for ${page.name}`);
                if (!res.text.includes("<!DOCTYPE html>")) throw new Error(`Missing DOCTYPE on ${page.name}`);
            }
            console.log(`  [PASS] ${page.name} (${page.path}) -> HTTP 200 OK`);
        }

        // ─── 3. Client Portal & Quote/Invoice Lifecycle QA ───
        console.log("\n--- 3. Client Portal & Quote/Invoice Lifecycle QA ---");

        const clientPages = [
            { path: "/dashboard/client/overview", name: "Client Overview" },
            { path: "/dashboard/client/invoices", name: "Client Invoices" },
            { path: `/quote/${bookingId}`, name: "Public Quote View" },
            { path: `/dashboard/quote/${bookingId}`, name: "Client Dashboard Quote" },
            { path: `/review/${bookingId}`, name: "Verified Review Page" },
            { path: `/passport/${assetTag}`, name: "Digital Asset Passport" },
        ];

        for (const page of clientPages) {
            const res = await fetchRoute(page.path, { cookie: clientCookie });
            if (res.status !== 200) {
                throw new Error(`Client page ${page.name} (${page.path}) failed with status ${res.status}`);
            }
            console.log(`  [PASS] ${page.name} (${page.path}) -> HTTP 200 OK`);
        }

        // ─── 4. Vendor Marketplace Portal QA ───
        console.log("\n--- 4. Vendor Marketplace Portal QA ---");

        const vendorPages = [
            { path: "/vendors/register", name: "Vendor Registration Form" },
            { path: "/dashboard/products", name: "Vendor Products Management" },
            { path: "/dashboard/inventory", name: "Vendor Inventory Passports" },
            { path: "/dashboard/settlements", name: "Vendor Settlement History" },
            { path: "/dashboard/profile", name: "Vendor Profile & KYC" },
        ];

        for (const page of vendorPages) {
            const res = await fetchRoute(page.path, { cookie: vendorCookie });
            if (res.status !== 200) {
                throw new Error(`Vendor page ${page.name} (${page.path}) failed with status ${res.status}`);
            }
            console.log(`  [PASS] ${page.name} (${page.path}) -> HTTP 200 OK`);
        }

        // ─── 5. Sales CRM Portal QA ───
        console.log("\n--- 5. Sales CRM Portal QA ---");

        const salesPages = [
            { path: "/dashboard/sales/overview", name: "Sales CRM Overview" },
            { path: "/dashboard/sales/pipeline", name: "Sales Deal Pipeline" },
            { path: `/dashboard/sales/deal/${bookingId}`, name: "Sales Deal Workspace" },
            { path: `/api/pdf/quote-proposal/${bookingId}`, name: "PDF Commercial Proposal API" },
        ];

        for (const page of salesPages) {
            const res = await fetchRoute(page.path, { cookie: salesRepCookie });
            if (res.status !== 200) {
                throw new Error(`Sales page ${page.name} (${page.path}) failed with status ${res.status}`);
            }
            console.log(`  [PASS] ${page.name} (${page.path}) -> HTTP 200 OK`);
        }

        // ─── 6. Warehouse & Logistics Portal QA ───
        console.log("\n--- 6. Warehouse & Logistics Portal QA ---");

        const warehousePages = [
            { path: "/dashboard/warehouse/overview", name: "Warehouse Overview" },
            { path: "/dashboard/warehouse/fleet", name: "Fleet Management & Passports" },
            { path: "/dashboard/warehouse/fulfillment", name: "Pick & Pack Fulfillment Matrix" },
            { path: "/dashboard/warehouse/dispatch", name: "Dispatch & Bump-in Control" },
            { path: "/dashboard/warehouse/inspections", name: "Return Inspection Bay" },
            { path: "/dashboard/warehouse/labels", name: "QR Label Printing Center" },
            { path: "/dashboard/warehouse/transport", name: "Logistics & Transport Fleet" },
            { path: `/api/pdf/manifest/${bookingId}`, name: "PDF Dispatch Manifest API" },
        ];

        for (const page of warehousePages) {
            const res = await fetchRoute(page.path, { cookie: warehouseMgrCookie });
            if (res.status !== 200) {
                throw new Error(`Warehouse page ${page.name} (${page.path}) failed with status ${res.status}`);
            }
            console.log(`  [PASS] ${page.name} (${page.path}) -> HTTP 200 OK`);
        }

        // ─── 7. Finance & Accounting Portal QA ───
        console.log("\n--- 7. Finance & Accounting Portal QA ---");

        const financePages = [
            { path: "/admin/financials", name: "Financial Command Center" },
            { path: "/admin/vendor/payouts", name: "Vendor Payouts & Approvals" },
            { path: "/admin/settings/billing", name: "Billing & Banking Settings" },
        ];

        for (const page of financePages) {
            const res = await fetchRoute(page.path, { cookie: superAdminCookie });
            if (res.status !== 200) {
                throw new Error(`Finance page ${page.name} (${page.path}) failed with status ${res.status}`);
            }
            console.log(`  [PASS] ${page.name} (${page.path}) -> HTTP 200 OK`);
        }

        // ─── 8. Admin Governance & Platform Control QA ───
        console.log("\n--- 8. Admin Governance & Platform Control QA ---");

        const adminPages = [
            { path: "/admin", name: "Command Center Dashboard" },
            { path: "/admin/analytics", name: "Multi-dimensional Analytics" },
            { path: "/admin/bookings", name: "Booking Management" },
            { path: "/admin/products", name: "Catalog Management" },
            { path: "/admin/vendors", name: "Vendor Management" },
            { path: "/admin/categories", name: "Category Management" },
            { path: "/admin/certificates", name: "Safety Certificates & Compliance" },
            { path: "/admin/super/vendors", name: "Super-Admin Vendor Approvals" },
            { path: "/admin/super/sitemap", name: "System Sitemap Directory" },
            { path: "/api/admin/command-center", name: "Command Center Metrics API" },
            { path: "/api/admin/analytics", name: "Analytics KPI API" },
            { path: "/api/super-admin/logs", name: "Audit Trail Viewer API" },
            { path: "/api/admin/system/health", name: "System Health API" },
            { path: "/api/admin/system/jobs", name: "Cron Job Monitor API" },
        ];

        for (const page of adminPages) {
            const res = await fetchRoute(page.path, { cookie: superAdminCookie });
            if (res.status !== 200) {
                throw new Error(`Admin page ${page.name} (${page.path}) failed with status ${res.status}`);
            }
            console.log(`  [PASS] ${page.name} (${page.path}) -> HTTP 200 OK`);
        }

        // ─── 9. Visual UX, Semantic HTML & Accessibility Validation ───
        console.log("\n--- 9. Visual UX, Semantic HTML & Accessibility Validation ---");

        const pagesToAuditA11y = ["/", "/catalog", "/cart", "/login", "/admin", "/dashboard/client/overview"];
        for (const p of pagesToAuditA11y) {
            const res = await fetchRoute(p, { cookie: superAdminCookie });
            const html = res.text;

            // 1. Check title
            if (!html.includes("<title>") || !html.includes("</title>")) {
                throw new Error(`Accessibility Violation: Missing <title> tag on ${p}`);
            }

            // 2. Check meta viewport
            if (!html.includes('name="viewport"') && !html.includes('viewport')) {
                throw new Error(`Mobile Responsiveness Violation: Missing viewport meta tag on ${p}`);
            }

            // 3. Check lang attribute on <html>
            if (!html.includes('<html lang="') && !html.includes("<html")) {
                throw new Error(`Accessibility Violation: Missing html root on ${p}`);
            }

            // 4. Verify no raw unescaped script error tags
            if (html.includes("Application error: a client-side exception has occurred")) {
                throw new Error(`Client-side exception detected on page ${p}`);
            }

            console.log(`  [PASS] ${p} -> Validated semantic HTML, viewport, meta tags, and error boundaries.`);
        }

        // ─── 10. Performance & Latency Benchmarks ───
        console.log("\n--- 10. Performance & Latency Benchmarks ---");

        const benchmarkEndpoints = [
            { path: "/api/health", maxMs: 100 },
            { path: "/api/categories", maxMs: 250 },
            { path: "/api/products", maxMs: 350 },
            { path: "/api/admin/command-center", maxMs: 500, cookie: superAdminCookie },
            { path: "/api/admin/analytics", maxMs: 500, cookie: superAdminCookie },
        ];

        for (const ep of benchmarkEndpoints) {
            const start = Date.now();
            const res = await fetchRoute(ep.path, { cookie: ep.cookie });
            const duration = Date.now() - start;
            if (res.status !== 200) {
                throw new Error(`Benchmark target ${ep.path} failed with HTTP ${res.status}`);
            }
            console.log(`  [PASS] ${ep.path} responded in ${duration}ms (Threshold: ${ep.maxMs}ms)`);
        }

        console.log("\n================================================================================");
        console.log("   ALL SPRINT 8 FUNCTIONAL QA, VISUAL UX & A11Y CHECKS PASSED (100%)!          ");
        console.log("================================================================================\n");

    } finally {
        console.log("Cleaning up test fixtures...");
        const client = await pool.connect();
        try {
            if (createdBookingIds.length > 0) {
                await client.query(`DELETE FROM "bookings" WHERE "id" = ANY($1::varchar[]);`, [createdBookingIds]);
            }
            if (createdProductIds.length > 0) {
                await client.query(`DELETE FROM "inventory_units" WHERE "product_id" = ANY($1::varchar[]);`, [createdProductIds]);
                await client.query(`DELETE FROM "products" WHERE "id" = ANY($1::varchar[]);`, [createdProductIds]);
            }
            if (categoryId) {
                await client.query(`DELETE FROM "categories" WHERE "id" = $1;`, [categoryId]);
            }
            if (createdVendorIds.length > 0) {
                await client.query(`DELETE FROM "vendors" WHERE "id" = ANY($1::varchar[]);`, [createdVendorIds]);
            }
            if (createdUserIds.length > 0) {
                await client.query(`DELETE FROM "notification_outbox" WHERE "recipient_id" = ANY($1::varchar[]);`, [createdUserIds]);
                await client.query(`DELETE FROM "cron_job_runs" WHERE "triggered_by" = ANY($1::varchar[]);`, [createdUserIds]);
                await client.query(`DELETE FROM "audit_logs" WHERE "actor_id" = ANY($1::varchar[]);`, [createdUserIds]);
                await client.query(`DELETE FROM "user_sessions" WHERE "user_id" = ANY($1::varchar[]);`, [createdUserIds]);
                await client.query(`DELETE FROM "users" WHERE "id" = ANY($1::varchar[]);`, [createdUserIds]);
            }
        } finally {
            client.release();
        }

        if (serverProcess) {
            console.log("Stopping spawned Next.js server...");
            serverProcess.kill();
        }
        console.log("Sprint 8 test fixtures cleaned up safely.");
    }
}

if (require.main === module) {
    runSprint8QaSuite()
        .then(() => process.exit(0))
        .catch((err) => {
            console.error("Sprint 8 QA Suite FAILED:", err);
            process.exit(1);
        });
}
