import { BrowserContext, Page } from "@playwright/test";
import { db, pool } from "../src/lib/db";
import { users, categories, products, inventoryUnits, bookings, invoices, clientPayments, vendors, safetyCertificates } from "../src/lib/db/schema";
import { USER_ROLES } from "../src/lib/constants";
import { v4 as uuid } from "uuid";
import { signToken } from "../src/lib/auth";

export interface PersonaCredentials {
    id: string;
    email: string;
    role: string;
    name: string;
    token: string;
}

export interface E2ETestFixtures {
    superAdmin: PersonaCredentials;
    admin: PersonaCredentials;
    salesRep: PersonaCredentials;
    warehouseMgr: PersonaCredentials;
    vendorUser: PersonaCredentials;
    clientUser: PersonaCredentials;
    vendorProfileId: string;
    categoryId: string;
    productId: string;
    productSlug: string;
    assetTag: string;
    bookingId: string;
    invoiceId: string;
    loginAsPersona: (context: BrowserContext, persona: PersonaCredentials) => Promise<Page>;
    cleanup: () => Promise<void>;
}

export async function setupE2EFixtures(): Promise<E2ETestFixtures> {
    const testRunId = Date.now().toString(36);
    const superAdminId = uuid();
    const adminId = uuid();
    const salesRepId = uuid();
    const warehouseMgrId = uuid();
    const vendorUserId = uuid();
    const clientId = uuid();

    const superAdminEmail = `super_${testRunId}@e3.qa`.toLowerCase();
    const adminEmail = `admin_${testRunId}@e3.qa`.toLowerCase();
    const salesRepEmail = `sales_${testRunId}@e3.qa`.toLowerCase();
    const warehouseMgrEmail = `wh_${testRunId}@e3.qa`.toLowerCase();
    const vendorEmail = `vendor_${testRunId}@e3.qa`.toLowerCase();
    const clientEmail = `client_${testRunId}@e3.qa`.toLowerCase();

    await db.insert(users).values([
        { id: superAdminId, name: "Super Admin", email: superAdminEmail, password: "password123", role: USER_ROLES.SUPER_ADMIN, status: "active" },
        { id: adminId, name: "Admin Lead", email: adminEmail, password: "password123", role: USER_ROLES.ADMIN, status: "active" },
        { id: salesRepId, name: "Sales Representative", email: salesRepEmail, password: "password123", role: USER_ROLES.SALES_REP, status: "active" },
        { id: warehouseMgrId, name: "Warehouse Manager", email: warehouseMgrEmail, password: "password123", role: USER_ROLES.WAREHOUSE_MANAGER, status: "active" },
        { id: vendorUserId, name: "Vendor Director", email: vendorEmail, password: "password123", role: USER_ROLES.VENDOR, status: "active" },
        { id: clientId, name: "Client Corporate", email: clientEmail, password: "password123", role: USER_ROLES.CLIENT, status: "active" },
    ]);

    const superAdminToken = await signToken({ id: superAdminId, email: superAdminEmail, role: USER_ROLES.SUPER_ADMIN });
    const adminToken = await signToken({ id: adminId, email: adminEmail, role: USER_ROLES.ADMIN });
    const salesRepToken = await signToken({ id: salesRepId, email: salesRepEmail, role: USER_ROLES.SALES_REP });
    const warehouseMgrToken = await signToken({ id: warehouseMgrId, email: warehouseMgrEmail, role: USER_ROLES.WAREHOUSE_MANAGER });
    const vendorToken = await signToken({ id: vendorUserId, email: vendorEmail, role: USER_ROLES.VENDOR });
    const clientToken = await signToken({ id: clientId, email: clientEmail, role: USER_ROLES.CLIENT });

    const vendorProfileId = uuid();
    await db.insert(vendors).values({
        id: vendorProfileId,
        userId: vendorUserId,
        companyName: `Apex Stage Systems ${testRunId}`,
        storeStatus: "active",
        kycStatus: "verified",
    });

    const categoryId = uuid();
    await db.insert(categories).values({
        id: categoryId,
        name: `Stage Lighting ${testRunId}`,
        slug: `stage-lighting-${testRunId}`,
    });

    const productId = uuid();
    const productSlug = `moving-beam-spot-700w-${testRunId}`;
    await db.insert(products).values({
        id: productId,
        vendorId: vendorProfileId,
        categoryId,
        name: `Moving Beam Spot 700W (${testRunId})`,
        slug: productSlug,
        pricePerDay: 1200,
        status: "published",
        isPublished: true,
        requiresLicense: false,
    });

    const assetTag = `E3-AST-${testRunId.toUpperCase()}-001`;
    await db.insert(inventoryUnits).values({
        id: uuid(),
        productId,
        vendorId: vendorProfileId,
        assetTagCode: assetTag,
        serialNumber: `MBS700-${testRunId}`,
        conditionStatus: "excellent",
        availabilityStatus: "in_warehouse",
    });

    const bookingId = uuid();
    await db.insert(bookings).values({
        id: bookingId,
        productId,
        userId: clientId,
        customerName: "Client Corporate",
        customerEmail: clientEmail,
        units: 2,
        startDate: new Date("2026-11-10T00:00:00Z"),
        endDate: new Date("2026-11-15T00:00:00Z"),
        totalPrice: 12000,
        status: "approved",
        paymentStatus: "paid",
    });

    const invoiceId = uuid();
    await db.insert(invoices).values({
        id: invoiceId,
        invoiceNumber: `INV-QA-${testRunId.toUpperCase()}`,
        bookingId,
        userId: clientId,
        customerName: "Client Corporate",
        customerEmail: clientEmail,
        subtotal: 12000,
        totalAmount: 12000,
        amountPaid: 12000,
        amountDue: 0,
        status: "paid",
        issueDate: new Date(),
        dueDate: new Date(Date.now() + 14 * 86400000),
    });

    const superAdmin = { id: superAdminId, email: superAdminEmail, role: USER_ROLES.SUPER_ADMIN, name: "Super Admin", token: superAdminToken };
    const admin = { id: adminId, email: adminEmail, role: USER_ROLES.ADMIN, name: "Admin Lead", token: adminToken };
    const salesRep = { id: salesRepId, email: salesRepEmail, role: USER_ROLES.SALES_REP, name: "Sales Representative", token: salesRepToken };
    const warehouseMgr = { id: warehouseMgrId, email: warehouseMgrEmail, role: USER_ROLES.WAREHOUSE_MANAGER, name: "Warehouse Manager", token: warehouseMgrToken };
    const vendorUser = { id: vendorUserId, email: vendorEmail, role: USER_ROLES.VENDOR, name: "Vendor Director", token: vendorToken };
    const clientUser = { id: clientId, email: clientEmail, role: USER_ROLES.CLIENT, name: "Client Corporate", token: clientToken };

    const loginAsPersona = async (context: BrowserContext, persona: PersonaCredentials): Promise<Page> => {
        const page = await context.newPage();
        const testIp = `10.10.${Math.floor(Math.random() * 250) + 1}.${Math.floor(Math.random() * 250) + 1}`;
        const res = await page.request.post("http://localhost:5001/api/auth/login", {
            data: { email: persona.email, password: "password123" },
            headers: { "x-forwarded-for": testIp },
        });
        if (!res.ok()) {
            throw new Error(`Failed to login as ${persona.email}: ${res.status()}`);
        }
        return page;
    };

    const cleanup = async () => {
        const client = await pool.connect();
        try {
            await client.query(`DELETE FROM "client_payments" WHERE "booking_id" = $1;`, [bookingId]);
            await client.query(`DELETE FROM "invoices" WHERE "id" = $1;`, [invoiceId]);
            await client.query(`DELETE FROM "bookings" WHERE "id" = $1;`, [bookingId]);
            await client.query(`DELETE FROM "inventory_units" WHERE "product_id" = $1;`, [productId]);
            await client.query(`DELETE FROM "products" WHERE "id" = $1;`, [productId]);
            await client.query(`DELETE FROM "categories" WHERE "id" = $1;`, [categoryId]);
            await client.query(`DELETE FROM "vendors" WHERE "id" = $1;`, [vendorProfileId]);
            const userIds = [superAdminId, adminId, salesRepId, warehouseMgrId, vendorUserId, clientId];
            await client.query(`DELETE FROM "notification_outbox" WHERE "recipient_id" = ANY($1::varchar[]);`, [userIds]);
            await client.query(`DELETE FROM "cron_job_runs" WHERE "triggered_by" = ANY($1::varchar[]);`, [userIds]);
            await client.query(`DELETE FROM "audit_logs" WHERE "actor_id" = ANY($1::varchar[]);`, [userIds]);
            await client.query(`DELETE FROM "system_logs" WHERE "admin_id" = ANY($1::varchar[]);`, [userIds]);
            await client.query(`DELETE FROM "user_sessions" WHERE "user_id" = ANY($1::varchar[]);`, [userIds]);
            await client.query(`DELETE FROM "users" WHERE "id" = ANY($1::varchar[]);`, [userIds]);
        } finally {
            client.release();
        }
    };

    return {
        superAdmin,
        admin,
        salesRep,
        warehouseMgr,
        vendorUser,
        clientUser,
        vendorProfileId,
        categoryId,
        productId,
        productSlug,
        assetTag,
        bookingId,
        invoiceId,
        loginAsPersona,
        cleanup,
    };
}
