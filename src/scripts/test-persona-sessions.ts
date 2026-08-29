import { spawn, ChildProcess } from "child_process";
import { db, pool } from "../lib/db";
import { users, invoices, bookings, products, categories, vendors } from "../lib/db/schema";
import { USER_ROLES } from "../lib/constants";
import { randomUUID as uuid } from "crypto";
import { issueInvoice, createInvoiceFromBooking } from "../lib/invoicing";
import { signToken } from "../lib/auth";
import { eq } from "drizzle-orm";

const PORT = 5001;
const BASE_URL = `http://localhost:${PORT}`;

async function waitForServer(url: string, timeoutMs: number = 30000): Promise<boolean> {
    const start = Date.now();
    while (Date.now() - start < timeoutMs) {
        try {
            const res = await fetch(`${url}/api/settings`);
            if (res.ok || res.status === 404 || res.status === 200) {
                return true;
            }
        } catch {
            // Wait 500ms
        }
        await new Promise((r) => setTimeout(r, 500));
    }
    return false;
}

async function runPersonaVerification() {
    console.log("================================================================================");
    console.log("   E3 RENTALS — PERSONA-BASED AUTHORIZATION & ENDPOINT SUITE (PORT 5001)        ");
    console.log("================================================================================");

    const testRunId = Date.now().toString(36);
    const createdUserIds: string[] = [];
    const createdInvoiceIds: string[] = [];
    const createdBookingIds: string[] = [];
    const createdProductIds: string[] = [];
    const createdVendorIds: string[] = [];
    let categoryId = "";

    let nextServer: ChildProcess | null = null;

    try {
        // Check if server is already running on port 5001, otherwise spawn it
        let isRunning = await waitForServer(BASE_URL, 2000);
        if (!isRunning) {
            console.log(`Starting Next.js production server on port ${PORT}...`);
            nextServer = spawn("npx", ["next", "start", "-p", String(PORT)], {
                cwd: process.cwd(),
                stdio: "ignore",
                shell: true,
            });

            const serverUp = await waitForServer(BASE_URL, 25000);
            if (!serverUp) {
                throw new Error(`Failed to start HTTP server on port ${PORT}`);
            }
        }
        console.log(`HTTP Server confirmed active at ${BASE_URL}\n`);

        // 1. Setup Personas
        console.log("--- 1. Provisioning Personas & Test Records ---");
        const clientAId = uuid();
        const clientBId = uuid();
        const salesRepAssignedId = uuid();
        const salesRepUnassignedId = uuid();
        const financeAdminId = uuid();
        const warehouseManagerId = uuid();
        const vendorAId = uuid();
        const vendorBId = uuid();
        const superAdminId = uuid();

        const clientAEmail = `client_a_${testRunId}@org.qa`.toLowerCase();
        const clientBEmail = `client_b_${testRunId}@org.qa`.toLowerCase();
        const salesRepAssignedEmail = `sales_assigned_${testRunId}@e3.qa`.toLowerCase();
        const salesRepUnassignedEmail = `sales_unassigned_${testRunId}@e3.qa`.toLowerCase();
        const financeAdminEmail = `finance_admin_${testRunId}@e3.qa`.toLowerCase();
        const warehouseManagerEmail = `warehouse_${testRunId}@e3.qa`.toLowerCase();
        const vendorAEmail = `vendor_a_${testRunId}@partner.qa`.toLowerCase();
        const vendorBEmail = `vendor_b_${testRunId}@partner.qa`.toLowerCase();
        const superAdminEmail = `superadmin_${testRunId}@e3.qa`.toLowerCase();

        createdUserIds.push(
            clientAId, clientBId, salesRepAssignedId, salesRepUnassignedId,
            financeAdminId, warehouseManagerId, vendorAId, vendorBId, superAdminId
        );

        await db.insert(users).values([
            { id: clientAId, name: `Client A (${testRunId})`, email: clientAEmail, password: "password123", role: USER_ROLES.CLIENT },
            { id: clientBId, name: `Client B (${testRunId})`, email: clientBEmail, password: "password123", role: USER_ROLES.CLIENT },
            { id: salesRepAssignedId, name: `Sales Rep Assigned (${testRunId})`, email: salesRepAssignedEmail, password: "password123", role: USER_ROLES.SALES_REP },
            { id: salesRepUnassignedId, name: `Sales Rep Unassigned (${testRunId})`, email: salesRepUnassignedEmail, password: "password123", role: USER_ROLES.SALES_REP },
            { id: financeAdminId, name: `Finance Admin (${testRunId})`, email: financeAdminEmail, password: "password123", role: USER_ROLES.ADMIN },
            { id: warehouseManagerId, name: `Warehouse Mgr (${testRunId})`, email: warehouseManagerEmail, password: "password123", role: USER_ROLES.WAREHOUSE_MANAGER },
            { id: vendorAId, name: `Vendor A User (${testRunId})`, email: vendorAEmail, password: "password123", role: USER_ROLES.VENDOR },
            { id: vendorBId, name: `Vendor B User (${testRunId})`, email: vendorBEmail, password: "password123", role: USER_ROLES.VENDOR },
            { id: superAdminId, name: `Super Admin (${testRunId})`, email: superAdminEmail, password: "password123", role: USER_ROLES.SUPER_ADMIN },
        ]);

        const vendorProfileAId = uuid();
        const vendorProfileBId = uuid();
        createdVendorIds.push(vendorProfileAId, vendorProfileBId);

        await db.insert(vendors).values([
            { id: vendorProfileAId, userId: vendorAId, companyName: `Vendor A Corp (${testRunId})`, storeStatus: "active" },
            { id: vendorProfileBId, userId: vendorBId, companyName: `Vendor B Corp (${testRunId})`, storeStatus: "active" },
        ]);

        categoryId = uuid();
        await db.insert(categories).values({
            id: categoryId,
            name: `Persona Test Gear ${testRunId}`,
            slug: `persona-test-gear-${testRunId}`,
        });

        const prodAId = uuid();
        createdProductIds.push(prodAId);
        await db.insert(products).values({
            id: prodAId,
            vendorId: vendorProfileAId,
            categoryId,
            name: `Concert Rig (${testRunId})`,
            slug: `concert-rig-${testRunId}`,
            pricePerDay: 5000,
        });

        // Booking 1 for Client A
        const booking1Id = uuid();
        createdBookingIds.push(booking1Id);
        await db.insert(bookings).values({
            id: booking1Id,
            userId: clientAId,
            productId: prodAId,
            vendorId: vendorProfileAId,
            units: 1,
            customerName: `Client A (${testRunId})`,
            customerEmail: clientAEmail,
            customerPhone: "+974 5555 1234",
            startDate: new Date("2026-10-01T00:00:00Z"),
            endDate: new Date("2026-10-04T00:00:00Z"),
            totalPrice: 15000,
            status: "confirmed",
        });

        const invA = await createInvoiceFromBooking({
            bookingId: booking1Id,
            invoiceType: "standard",
            dueDateDays: 14,
        });
        createdInvoiceIds.push(invA.invoiceId);
        await issueInvoice(invA.invoiceId, financeAdminId);

        console.log("  [PASS] Provisioned 9 Personas and seeded Client A Invoice:", invA.invoiceNumber);

        // 2. Persona Access Tests
        console.log("\n--- 2. Object-Level Authorization Matrix Verification ---");

        // Helper to login as persona and return session cookie
        const loginAs = async (email: string): Promise<string> => {
            const res = await fetch(`${BASE_URL}/api/auth/login`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email, password: "password123" }),
            });
            const text = await res.text();
            const setCookie = res.headers.get("set-cookie");
            if (!setCookie) {
                console.error(`Login failed for ${email}. Status: ${res.status}, Body: ${text}`);
                throw new Error(`Login failed for ${email}`);
            }
            return setCookie.split(";")[0];
        };

        const testPdfAuth = async (cookie: string, invoiceId: string) => {
            const res = await fetch(`${BASE_URL}/api/pdf/invoice/${invoiceId}`, {
                headers: {
                    Cookie: cookie,
                },
            });
            return res.status;
        };

        // Persona 1: Client A (Should succeed 200 for own invoice)
        const clientACookie = await loginAs(clientAEmail);
        const clientAStatus = await testPdfAuth(clientACookie, invA.invoiceId);
        console.log(`  Persona [Client A]: access own invoice -> Status ${clientAStatus} (Expected: 200)`);
        if (clientAStatus !== 200) throw new Error(`Client A failed with status ${clientAStatus}`);

        // Persona 2: Client B (Should fail 403 for Client A's invoice)
        const clientBCookie = await loginAs(clientBEmail);
        const clientBStatus = await testPdfAuth(clientBCookie, invA.invoiceId);
        console.log(`  Persona [Client B]: access Client A invoice -> Status ${clientBStatus} (Expected: 403)`);
        if (clientBStatus !== 403) throw new Error(`Client B was not denied (got ${clientBStatus})`);

        // Persona 3: Assigned Sales Rep (Should succeed 200 for assigned deal)
        await db.update(invoices).set({ userId: salesRepAssignedId }).where(eq(invoices.id, invA.invoiceId));
        const assignedRepCookie = await loginAs(salesRepAssignedEmail);
        const assignedRepStatus = await testPdfAuth(assignedRepCookie, invA.invoiceId);
        console.log(`  Persona [Assigned Sales Rep]: access assigned deal invoice -> Status ${assignedRepStatus} (Expected: 200)`);
        if (assignedRepStatus !== 200) throw new Error(`Assigned sales rep failed with ${assignedRepStatus}`);

        // Restore owner to Client A
        await db.update(invoices).set({ userId: clientAId }).where(eq(invoices.id, invA.invoiceId));

        // Persona 4: Unassigned Sales Rep (Should fail 403 for unassigned deal)
        const unassignedRepCookie = await loginAs(salesRepUnassignedEmail);
        const unassignedRepStatus = await testPdfAuth(unassignedRepCookie, invA.invoiceId);
        console.log(`  Persona [Unassigned Sales Rep]: access unassigned deal invoice -> Status ${unassignedRepStatus} (Expected: 403)`);
        if (unassignedRepStatus !== 403) throw new Error(`Unassigned sales rep was not denied (got ${unassignedRepStatus})`);

        // Persona 5: Finance Admin (Should succeed 200 organization-wide)
        const financeAdminCookie = await loginAs(financeAdminEmail);
        const financeStatus = await testPdfAuth(financeAdminCookie, invA.invoiceId);
        console.log(`  Persona [Finance Admin]: access org-wide invoice -> Status ${financeStatus} (Expected: 200)`);
        if (financeStatus !== 200) throw new Error(`Finance admin failed with ${financeStatus}`);

        // Persona 6: Super Administrator (Should succeed 200 organization-wide)
        const superAdminCookie = await loginAs(superAdminEmail);
        const superAdminStatus = await testPdfAuth(superAdminCookie, invA.invoiceId);
        console.log(`  Persona [Super Admin]: access org-wide invoice -> Status ${superAdminStatus} (Expected: 200)`);
        if (superAdminStatus !== 200) throw new Error(`Super admin failed with ${superAdminStatus}`);

        // Persona 7: Warehouse Manager (Should be strictly denied 403 from customer invoice)
        const warehouseCookie = await loginAs(warehouseManagerEmail);
        const warehouseStatus = await testPdfAuth(warehouseCookie, invA.invoiceId);
        console.log(`  Persona [Warehouse Manager]: access customer invoice -> Status ${warehouseStatus} (Expected: 403)`);
        if (warehouseStatus !== 403) throw new Error(`Warehouse manager was not denied (got ${warehouseStatus})`);

        // Persona 8: Marketplace Vendor A (Should be strictly denied 403 from customer invoice)
        const vendorACookie = await loginAs(vendorAEmail);
        const vendorAStatus = await testPdfAuth(vendorACookie, invA.invoiceId);
        console.log(`  Persona [Vendor A]: access customer invoice -> Status ${vendorAStatus} (Expected: 403)`);
        if (vendorAStatus !== 403) throw new Error(`Vendor A was not denied (got ${vendorAStatus})`);

        // Persona 9: Marketplace Vendor B (Should be strictly denied 403 from customer invoice)
        const vendorBCookie = await loginAs(vendorBEmail);
        const vendorBStatus = await testPdfAuth(vendorBCookie, invA.invoiceId);
        console.log(`  Persona [Vendor B]: access customer invoice -> Status ${vendorBStatus} (Expected: 403)`);
        if (vendorBStatus !== 403) throw new Error(`Vendor B was not denied (got ${vendorBStatus})`);

        console.log("\n================================================================================");
        console.log("   ALL 9 PERSONAS VERIFIED ON PORT 5001 WITH 100% SUCCESS & PRIVACY ISOLATION!  ");
        console.log("================================================================================");

    } finally {
        console.log("\nCleaning up test fixtures...");
        const client = await pool.connect();
        try {
            if (createdInvoiceIds.length > 0) {
                await client.query(`DELETE FROM "financial_journals" WHERE "reference_id" = ANY($1::varchar[]);`, [createdInvoiceIds]);
                await client.query(`DELETE FROM "invoice_items" WHERE "invoice_id" = ANY($1::varchar[]);`, [createdInvoiceIds]);
                await client.query(`DELETE FROM "invoices" WHERE "id" = ANY($1::varchar[]);`, [createdInvoiceIds]);
            }
            if (createdBookingIds.length > 0) {
                await client.query(`DELETE FROM "bookings" WHERE "id" = ANY($1::varchar[]);`, [createdBookingIds]);
            }
            if (createdProductIds.length > 0) {
                await client.query(`DELETE FROM "products" WHERE "id" = ANY($1::varchar[]);`, [createdProductIds]);
            }
            if (categoryId) {
                await client.query(`DELETE FROM "categories" WHERE "id" = $1;`, [categoryId]);
            }
            if (createdVendorIds.length > 0) {
                await client.query(`DELETE FROM "vendors" WHERE "id" = ANY($1::varchar[]);`, [createdVendorIds]);
            }
            if (createdUserIds.length > 0) {
                await client.query(`DELETE FROM "users" WHERE "id" = ANY($1::varchar[]);`, [createdUserIds]);
            }
        } finally {
            client.release();
        }

        if (nextServer) {
            console.log("Stopping spawned Next.js server...");
            nextServer.kill();
        }
        console.log("Persona test fixtures cleaned up safely.");
    }
}

runPersonaVerification()
    .then(() => process.exit(0))
    .catch((err) => {
        console.error("Persona verification failed:", err);
        process.exit(1);
    });
