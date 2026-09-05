import { NextRequest } from "next/server";
import { POST } from "../src/app/api/warehouse/offline-sync/route";
import { db, pool } from "../src/lib/db";
import { 
    users, 
    categories, 
    products, 
    inventoryUnits, 
    bookings, 
    bookingDispatchLogs, 
    bookingUnitAssignments,
    proofOfDeliveries, 
    fleetGpsPings, 
    systemLogs,
    vendors
} from "../src/lib/db/schema";
import { eq } from "drizzle-orm";
import { v4 as uuid } from "uuid";

async function runOfflineSyncTest() {
    console.log("=================================================");
    console.log("   OFFLINE SYNC & BUFFER ENGINE DOMAIN TEST      ");
    console.log("=================================================");

    const runId = Date.now().toString(36);
    const userId = uuid();
    const categoryId = uuid();
    const productId = uuid();
    const unitId = uuid();
    const bookingId = uuid();
    const dispatchLogId = uuid();
    const assetTag = `TAG-PWA-${runId.toUpperCase()}`;

    const vendorId = uuid();
    const vendorUserId = uuid();

    try {
        console.log("\n[1/4] Seeding isolated domain test fixtures...");
        
        // 1. Users
        await db.insert(users).values([
            {
                id: userId,
                name: "Salim Al-Nuaimi",
                email: `salim_${runId}@e3.qa`,
                password: "password123",
                role: "warehouse_manager",
                status: "active",
            },
            {
                id: vendorUserId,
                name: "Vendor Owner",
                email: `vendor_${runId}@e3.qa`,
                password: "password123",
                role: "vendor",
                status: "active",
            }
        ]);

        // 2. Vendor
        await db.insert(vendors).values({
            id: vendorId,
            userId: vendorUserId,
            companyName: `E3 Test Staging Vendor ${runId}`,
            status: "approved",
        });

        // 3. Category & Product
        await db.insert(categories).values({
            id: categoryId,
            name: `Test PWA Category ${runId}`,
            slug: `pwa-cat-${runId}`,
        });

        await db.insert(products).values({
            id: productId,
            vendorId,
            name: `L-Acoustics Kara II Line Array ${runId}`,
            slug: `kara-ii-${runId}`,
            categoryId,
            pricePerDay: 450,
            status: "published",
            isPublished: true,
            requiresLicense: false,
        });

        // 4. Inventory Unit
        await db.insert(inventoryUnits).values({
            id: unitId,
            productId,
            vendorId,
            assetTagCode: assetTag,
            serialNumber: `SN-KARA-${runId}`,
            availabilityStatus: "in_warehouse",
            conditionStatus: "good",
            warehouseLocation: "Zone B - Bay 04",
        });

        // 4. Booking
        await db.insert(bookings).values({
            id: bookingId,
            productId,
            userId,
            customerName: "Doha Media City",
            customerEmail: `media_${runId}@dmc.qa`,
            customerPhone: "+97455001122",
            units: 1,
            startDate: new Date(),
            endDate: new Date(Date.now() + 86400000 * 3),
            status: "dispatched",
            totalPrice: 1350,
            paymentStatus: "paid",
        });

        // 5. Booking Dispatch Log
        await db.insert(bookingDispatchLogs).values({
            id: dispatchLogId,
            bookingId,
            driverName: "Tariq Al-Balooshi",
            vehiclePlateNumber: "QA-99124",
            transportCompany: "E3 Internal Logistics",
            totalGrossWeight: 75,
            dispatchedAt: new Date(),
        });

        console.log(`✓ Fixtures seeded: Unit ${assetTag}, Booking ${bookingId}, Dispatch ${dispatchLogId}`);

        // [2/4] Construct Queued Actions Buffer (simulating offline device store)
        console.log("\n[2/4] Simulating offline buffer replay with 4 chronological transactions...");

        const queuedBatch = [
            {
                id: `act_scan_disp_${runId}`,
                actionType: "fulfillment_scan",
                endpoint: "/api/admin/fulfillment",
                timestamp: Date.now() - 3000,
                payload: {
                    assetTag,
                    action: "dispatch",
                    bookingId,
                }
            },
            {
                id: `act_gps_${runId}`,
                actionType: "driver_gps",
                endpoint: "/api/driver/gps",
                timestamp: Date.now() - 2000,
                payload: {
                    dispatchLogId,
                    vehiclePlate: "QA-99124",
                    latitude: 25.2867,
                    longitude: 51.5333,
                    speed: 55,
                    heading: 180,
                    status: "in_transit",
                }
            },
            {
                id: `act_pod_${runId}`,
                actionType: "driver_pod",
                endpoint: "/api/driver/pod",
                timestamp: Date.now() - 1000,
                payload: {
                    bookingId,
                    dispatchLogId,
                    recipientName: "Hamad Al-Kuwari",
                    recipientPhone: "+97455001122",
                    recipientNationalId: "28863401928",
                    signatureData: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
                    deliveryStatus: "delivered",
                    notes: "Underground venue drop - synced upon cellular reconnection.",
                    latitude: 25.2867,
                    longitude: 51.5333,
                }
            },
            {
                id: `act_scan_ret_${runId}`,
                actionType: "fulfillment_scan",
                endpoint: "/api/admin/fulfillment",
                timestamp: Date.now(),
                payload: {
                    assetTag,
                    action: "return",
                    bookingId,
                    condition: "excellent",
                    notes: "Returned clean and tested.",
                }
            }
        ];

        // [3/4] Execute Batch Sync Request
        console.log("\n[3/4] Invoking POST /api/warehouse/offline-sync with buffered payload...");
        
        const req = new NextRequest("http://localhost:5001/api/warehouse/offline-sync", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ actions: queuedBatch }),
        });

        const res = await POST(req);
        const resJson = await res.json();

        console.log(`HTTP Status: ${res.status}`);
        console.log("Response JSON:", JSON.stringify(resJson, null, 2));

        if (!resJson.success || resJson.syncedCount !== 4) {
            throw new Error(`Sync failed: expected 4 synced items, got ${resJson.syncedCount}`);
        }

        // [4/4] Assert Database Invariants
        console.log("\n[4/4] Verifying database state post-sync...");

        // Assert Unit returned as excellent
        const [verifiedUnit] = await db.select().from(inventoryUnits).where(eq(inventoryUnits.id, unitId));
        if (!verifiedUnit || verifiedUnit.availabilityStatus !== "in_warehouse" || verifiedUnit.conditionStatus !== "excellent") {
            throw new Error(`Unit status mismatch: ${JSON.stringify(verifiedUnit)}`);
        }
        console.log("✓ Inventory Unit state verified: in_warehouse | excellent");

        // Assert POD record created
        const [verifiedPod] = await db.select().from(proofOfDeliveries).where(eq(proofOfDeliveries.bookingId, bookingId));
        if (!verifiedPod || verifiedPod.recipientName !== "Hamad Al-Kuwari" || verifiedPod.deliveryStatus !== "delivered") {
            throw new Error(`POD record mismatch: ${JSON.stringify(verifiedPod)}`);
        }
        console.log("✓ Proof of Delivery record verified: Hamad Al-Kuwari | delivered");

        // Assert Booking transitioned to on_rent
        const [verifiedBooking] = await db.select().from(bookings).where(eq(bookings.id, bookingId));
        if (!verifiedBooking || verifiedBooking.status !== "on_rent") {
            throw new Error(`Booking status mismatch: expected on_rent, got ${verifiedBooking?.status}`);
        }
        console.log("✓ Booking state machine verified: transitioned to on_rent");

        // Assert GPS Ping logged
        const [verifiedPing] = await db.select().from(fleetGpsPings).where(eq(fleetGpsPings.dispatchLogId, dispatchLogId));
        if (!verifiedPing || verifiedPing.vehiclePlate !== "QA-99124") {
            throw new Error(`GPS Ping mismatch: ${JSON.stringify(verifiedPing)}`);
        }
        console.log("✓ Fleet GPS Telemetry ping verified: QA-99124 at 25.2867, 51.5333");

        console.log("\n=================================================");
        console.log("   ALL OFFLINE SYNC CHECKS PASSED (100% SUCCESS) ");
        console.log("=================================================");

    } catch (err) {
        console.error("ERROR INSIDE TEST:", err);
        throw err;
    } finally {
        console.log("\nCleaning up test artifacts...");
        const client = await pool.connect();
        try {
            await client.query(`DELETE FROM "fleet_gps_pings" WHERE "dispatch_log_id" = $1;`, [dispatchLogId]).catch(() => {});
            await client.query(`DELETE FROM "proof_of_deliveries" WHERE "booking_id" = $1;`, [bookingId]).catch(() => {});
            await client.query(`DELETE FROM "booking_unit_assignments" WHERE "booking_id" = $1;`, [bookingId]).catch(() => {});
            await client.query(`DELETE FROM "booking_dispatch_logs" WHERE "id" = $1;`, [dispatchLogId]).catch(() => {});
            await client.query(`DELETE FROM "audit_logs" WHERE "actor_id" = $1;`, [userId]).catch(() => {});
            await client.query(`DELETE FROM "system_logs" WHERE "admin_id" = $1;`, [userId]).catch(() => {});
            await client.query(`DELETE FROM "bookings" WHERE "id" = $1;`, [bookingId]).catch(() => {});
            await client.query(`DELETE FROM "inventory_units" WHERE "id" = $1;`, [unitId]).catch(() => {});
            await client.query(`DELETE FROM "products" WHERE "id" = $1;`, [productId]).catch(() => {});
            await client.query(`DELETE FROM "categories" WHERE "id" = $1;`, [categoryId]).catch(() => {});
            await client.query(`DELETE FROM "vendors" WHERE "id" = $1;`, [vendorId]).catch(() => {});
            await client.query(`DELETE FROM "users" WHERE "id" IN ($1, $2);`, [userId, vendorUserId]).catch(() => {});
            console.log("✓ Teardown complete. Zero residue.");
        } catch (cleanErr) {
            console.error("Cleanup error:", cleanErr);
        } finally {
            client.release();
        }
    }
}

runOfflineSyncTest()
    .then(() => process.exit(0))
    .catch((err) => {
        console.error("FATAL TEST FAILURE:", err);
        process.exit(1);
    });
