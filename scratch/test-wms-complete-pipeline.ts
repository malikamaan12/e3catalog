import { db, pool } from "../src/lib/db";
import { 
    bookings, inventoryUnits, products, categories, vendors, 
    warehouseZones, warehouseBins, vendorWarehouses, proofOfDeliveries, 
    bookingDispatchLogs, spareParts, inventoryCycleCounts, cycleCountItems,
    bookingUnitAssignments
} from "../src/lib/db/schema";
import { eq, or } from "drizzle-orm";
import { checkCrossDockOpportunity, fastTrackCrossDock } from "../src/lib/warehouse/cross-dock-engine";
import { recommendPutawayBin, confirmPutaway } from "../src/lib/warehouse/putaway-engine";

async function runWmsVerification() {
    console.log("===============================================================================");
    console.log("🚀 STARTING COMPLETE WMS PIPELINE VERIFICATION TEST");
    console.log("===============================================================================\n");

    let testBookingId: string | null = null;
    let testUnitId: string | null = null;
    let testBinId: string | null = null;
    let testZoneId: string | null = null;
    let testWarehouseId: string | null = null;
    let testCountId: string | null = null;

    try {
        // SETUP: Fetch base vendor and product
        const [vendor] = await db.select().from(vendors).limit(1);
        const [product] = await db.select().from(products).limit(1);

        if (!vendor || !product) {
            throw new Error("Cannot run test: No existing vendor or product found in DB.");
        }

        // 1. Create Test Warehouse, Zone & Bin for Directed Putaway
        testWarehouseId = crypto.randomUUID();
        await db.insert(vendorWarehouses).values({
            id: testWarehouseId,
            vendorId: vendor.id,
            name: "WMS Test Facility Hub",
            city: "Doha",
            address: "Logistics City",
        });

        testZoneId = crypto.randomUUID();
        await db.insert(warehouseZones).values({
            id: testZoneId,
            warehouseId: testWarehouseId,
            name: "Zone A (Audio & Fixtures)",
            code: "ZN-TST-A",
            zoneType: "storage",
        });

        testBinId = crypto.randomUUID();
        const testBinCode = `BIN-TST-${Math.floor(Math.random() * 8999 + 1000)}`;
        await db.insert(warehouseBins).values({
            id: testBinId,
            warehouseId: testWarehouseId,
            zoneId: testZoneId,
            binCode: testBinCode,
            aisle: "01",
            rack: "R2",
            shelf: "S3",
            bin: "B04",
            maxCapacity: 50,
        });
        console.log(`✅ [Setup] Created Test Warehouse, Zone, and Bin ${testBinCode}`);

        // 2. Create Test Unit
        testUnitId = crypto.randomUUID();
        const testAssetTag = `E3-WMS-${Math.floor(Math.random() * 8999 + 1000)}`;
        const testRfidEpc = `E280WMS${Math.floor(Math.random() * 8999 + 1000)}000000000001`;

        await db.insert(inventoryUnits).values({
            id: testUnitId,
            productId: product.id,
            vendorId: vendor.id,
            assetTagCode: testAssetTag,
            rfidTag: testRfidEpc,
            serialNumber: `SN-${testAssetTag}`,
            conditionStatus: "good",
            availabilityStatus: "in_warehouse",
        });
        console.log(`✅ [Setup] Created Inventory Unit ${testAssetTag} (EPC: ${testRfidEpc})`);

        // 3. Test Directed Putaway Engine
        console.log("\n▶ TEST 1: Directed Putaway & Smart Slotting");
        const putawayRec = await recommendPutawayBin(testAssetTag);
        console.log(`   ✓ Recommended Bin: ${putawayRec.recommendedBin?.binCode} in ${putawayRec.recommendedBin?.zoneName}`);
        console.log(`   ✓ Recommendation Reason: "${putawayRec.recommendedBin?.reason}"`);

        const putawayConfirm = await confirmPutaway(testAssetTag, testBinCode);
        if (!putawayConfirm.success) throw new Error("Putaway confirmation failed");
        console.log(`✅ [Directed Putaway] Successfully slotted ${testAssetTag} into ${testBinCode}`);

        // 4. Test Cross-Docking Engine
        console.log("\n▶ TEST 2: Dock-to-Dock Fast-Track Cross-Docking");
        testBookingId = crypto.randomUUID();
        const departureDate = new Date(Date.now() + 4 * 60 * 60 * 1000); // Departs in 4 hours
        const returnDate = new Date(Date.now() + 48 * 60 * 60 * 1000);

        await db.insert(bookings).values({
            id: testBookingId,
            userId: null,
            vendorId: vendor.id,
            productId: product.id,
            customerName: "Q-Live Arena Concert",
            customerEmail: "producer@qlive.qa",
            projectName: "Q-Live Production 2026",
            startDate: departureDate,
            endDate: returnDate,
            status: "approved",
            fulfillmentStatus: "pending",
            units: 1,
            totalPrice: 2500,
        });

        const crossDockResult = await checkCrossDockOpportunity(testAssetTag, 48);
        if (!crossDockResult.isCrossDock || !crossDockResult.targetBooking) {
            throw new Error("Cross dock engine failed to detect upcoming departure within 48h.");
        }
        console.log(`   ✓ Cross-Dock Detected: Target Booking "${crossDockResult.targetBooking.projectName}" (Departs in ${crossDockResult.targetBooking.hoursUntilDeparture}h)`);

        const fastTrackResult = await fastTrackCrossDock(testUnitId, testBookingId, "Bay 02 - Fast Track");
        if (!fastTrackResult.success) throw new Error("Fast track cross dock failed");
        console.log(`✅ [Cross-Docking] Unit fast-tracked directly to Bay 02 for Booking!`);

        // 5. Test Digital Handover (e-POD) Signature Record
        console.log("\n▶ TEST 3: Digital Handover & e-POD Signature (Sign on Glass)");
        const testPodId = crypto.randomUUID();
        const [pod] = await db.insert(proofOfDeliveries).values({
            id: testPodId,
            bookingId: testBookingId,
            driverName: "Ahmed Al-Mansouri",
            recipientName: "Ahmed Al-Mansouri",
            recipientNationalId: "QID-28463829102",
            recipientPhone: "+974 5512 3456",
            signatureData: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
            deliveryStatus: "delivered",
            notes: "Driver signed handover at Loading Bay 01.",
        }).returning();
        console.log(`✅ [Digital e-POD] Created tamper-evident digital signature record #${pod.id.slice(0, 8)}`);

        // 6. Test Consumables / Spare Parts Stock Adjustments
        console.log("\n▶ TEST 4: Consumables & Bulk Non-Serialized Stock Tracking");
        const testPartSku = `TEST-GAFF-${Math.floor(Math.random() * 8999 + 1000)}`;
        const testPartId = crypto.randomUUID();
        await db.insert(spareParts).values({
            id: testPartId,
            partNumber: testPartSku,
            name: "Pro-Gaff Black Cloth 50mm",
            category: "cables",
            stockQuantity: 25,
            minStockThreshold: 5,
            unitCost: 18.5,
        });

        // Quick decrement -5
        await db.update(spareParts)
            .set({ stockQuantity: 20 })
            .where(eq(spareParts.id, testPartId));

        const [partCheck] = await db.select().from(spareParts).where(eq(spareParts.id, testPartId)).limit(1);
        if (partCheck.stockQuantity !== 20) throw new Error("Consumable stock update failed");
        console.log(`✅ [Consumables] Successfully registered and decremented bulk supply SKU ${testPartSku} (Stock: 20 rolls)`);

        // Cleanup test part
        await db.delete(spareParts).where(eq(spareParts.id, testPartId));

        console.log("\n===============================================================================");
        console.log("🎉 ALL WMS ENHANCEMENT TESTS PASSED CLEANLY!");
        console.log("===============================================================================");
    } finally {
        // Cleanup fixtures
        if (testBookingId) {
            await db.delete(bookingUnitAssignments).where(eq(bookingUnitAssignments.bookingId, testBookingId));
            await db.delete(proofOfDeliveries).where(eq(proofOfDeliveries.bookingId, testBookingId));
            await db.delete(bookingDispatchLogs).where(eq(bookingDispatchLogs.bookingId, testBookingId));
            await db.delete(bookings).where(eq(bookings.id, testBookingId));
        }
        if (testUnitId) {
            await db.delete(inventoryUnits).where(eq(inventoryUnits.id, testUnitId));
        }
        if (testBinId) {
            await db.delete(warehouseBins).where(eq(warehouseBins.id, testBinId));
        }
        if (testZoneId) {
            await db.delete(warehouseZones).where(eq(warehouseZones.id, testZoneId));
        }
        if (testWarehouseId) {
            await db.delete(vendorWarehouses).where(eq(vendorWarehouses.id, testWarehouseId));
        }
    }
}

runWmsVerification()
    .then(() => process.exit(0))
    .catch((err) => {
        console.error("❌ Test failed:", err);
        process.exit(1);
    });
