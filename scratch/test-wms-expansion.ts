import { db } from "../src/lib/db";
import { 
    bookings, inventoryUnits, products, vendors, 
    maintenanceWorkOrders, damageClaims, inspectionLogs,
    flightCases, flightCaseContents, kitMissingItemClaims,
    bookingDispatchLogs, fleetGpsPings, bookingUnitAssignments
} from "../src/lib/db/schema";
import { eq, inArray } from "drizzle-orm";
import { createWorkOrderAndClaimFromReturn } from "../src/lib/warehouse/maintenance-bridge";
import { detectQatarZone, calculateHaversineDistanceKm, QATAR_HUBS } from "../src/lib/telemetry-gps";
import { 
    createFlightCase, 
    assignCaseContents, 
    verifyFlightCasePack, 
    verifyFlightCaseReturn,
    STANDARD_ACCESSORY_PENALTIES 
} from "../src/lib/kit-assemblies";

async function runWmsExpansionTests() {
    console.log("===============================================================================");
    console.log("🚀 STARTING WMS EXPANSION INTEGRATION VERIFICATION TEST");
    console.log("===============================================================================\n");

    let testBookingId: string | null = null;
    let testUnitId: string | null = null;
    let testFlightCaseId: string | null = null;
    let testDispatchLogId: string | null = null;
    let testPingId: string | null = null;
    let testWorkOrderId: string | null = null;
    let testClaimId: string | null = null;

    try {
        const [vendor] = await db.select().from(vendors).limit(1);
        const [product] = await db.select().from(products).limit(1);

        if (!vendor || !product) {
            throw new Error("Cannot run test: No existing vendor or product found in DB.");
        }

        // Setup Test Unit
        testUnitId = crypto.randomUUID();
        const testAssetTag = `E3-QC-${Math.floor(1000 + Math.random() * 9000)}`;
        await db.insert(inventoryUnits).values({
            id: testUnitId,
            productId: product.id,
            vendorId: vendor.id,
            assetTagCode: testAssetTag,
            conditionStatus: "good",
            availabilityStatus: "on_rent",
        });

        // Setup Test Booking
        testBookingId = crypto.randomUUID();
        await db.insert(bookings).values({
            id: testBookingId,
            productId: product.id,
            vendorId: vendor.id,
            customerName: "Grand Arena Gala 2026",
            customerEmail: "production@grandarena.qa",
            startDate: new Date(),
            endDate: new Date(Date.now() + 86400000 * 3),
            status: "approved",
            fulfillmentStatus: "out_for_delivery",
            projectName: "Grand Arena Gala Production",
        });

        // ─── TEST 1: Automated QC Work Order & Customer Damage Claim Bridge ───
        console.log("▶ TEST 1: Automated Technical QC Work Order & Damage Claim Generation");
        const bridgeResult = await createWorkOrderAndClaimFromReturn({
            unitId: testUnitId,
            bookingId: testBookingId,
            conditionAfter: "damaged",
            reportedIssue: "Bent chassis and cracked lens barrel returned from rock concert.",
            actorName: "Lead QC Tech",
            severity: "moderate",
            estimatedLaborHours: 3.5,
            laborRatePerHour: 60,
        });

        if (!bridgeResult.success || !bridgeResult.workOrder || !bridgeResult.damageClaim) {
            throw new Error(`Maintenance bridge failed: ${bridgeResult.error}`);
        }

        testWorkOrderId = bridgeResult.workOrder.id;
        testClaimId = bridgeResult.damageClaim.id;

        console.log(`   ✓ Created Work Order #${bridgeResult.workOrder.workOrderNumber} (Status: ${bridgeResult.workOrder.status}, Priority: ${bridgeResult.workOrder.priority})`);
        console.log(`   ✓ Created Customer Damage Claim #${bridgeResult.damageClaim.claimNumber} (Status: ${bridgeResult.damageClaim.status})`);

        // Verify unit availability status updated to in_maintenance
        const [unitCheck] = await db.select().from(inventoryUnits).where(eq(inventoryUnits.id, testUnitId));
        if (unitCheck.availabilityStatus !== "in_maintenance") {
            throw new Error(`Unit status should be 'in_maintenance', but found '${unitCheck.availabilityStatus}'`);
        }
        console.log(`✅ [Technical QC] Unit ${testAssetTag} auto-shifted to 'in_maintenance' with active repair ticket.`);

        // ─── TEST 2: Live Fleet Telematics & Qatar Zone Geofencing ───
        console.log("\n▶ TEST 2: Live Fleet Telematics & Qatar Logistics Zone Resolution");
        testDispatchLogId = crypto.randomUUID();
        await db.insert(bookingDispatchLogs).values({
            id: testDispatchLogId,
            bookingId: testBookingId,
            driverName: "Tariq Mansoor",
            vehiclePlateNumber: "QA-LOG-8821",
            transportCompany: "E3 Internal Fleet",
        });

        // Lusail Marina coordinate: 25.4215, 51.5290
        testPingId = crypto.randomUUID();
        await db.insert(fleetGpsPings).values({
            id: testPingId,
            dispatchLogId: testDispatchLogId,
            latitude: 25.4215,
            longitude: 51.5290,
            speed: 18.5, // m/s = 66.6 km/h
            heading: 45,
            batteryPct: 94,
        });

        const detectedZone = detectQatarZone(25.4215, 51.5290);
        console.log(`   ✓ Resolved GPS (25.4215, 51.5290) to Qatar Operational Zone: "${detectedZone}"`);
        if (!detectedZone.includes("Lusail")) {
            throw new Error(`Expected Lusail zone, got: ${detectedZone}`);
        }
        console.log(`✅ [Fleet Telematics] Successfully geofenced vehicle QA-LOG-8821 to Lusail hub (Speed: 67 km/h, Battery: 94%).`);

        // ─── TEST 3: Flight Case & Kit Integrity Gatekeeper ───
        console.log("\n▶ TEST 3: Flight Case & Kit Integrity Gate (Pack & Return Audits)");
        const fcNumber = `FC-TST-${Math.floor(1000 + Math.random() * 9000)}`;
        const fcTag = `E3-CASE-${Math.floor(1000 + Math.random() * 9000)}`;

        const createdCase = await createFlightCase({
            caseNumber: fcNumber,
            name: "RoboSpot Followspot System Trunk",
            assetTagCode: fcTag,
            tareWeightKg: 28,
            maxCapacityKg: 120,
            warehouseLocation: "Zone B - Bay 02",
        });
        testFlightCaseId = createdCase.id;

        // Assign sub-assembly accessories
        await assignCaseContents(testFlightCaseId, [
            { accessoryName: "Powercon / True1 Cable", expectedQuantity: 1 },
            { accessoryName: "Heavy Duty DMX Cable (20m)", expectedQuantity: 2 },
            { accessoryName: "Quick-Trigger Stage Clamp", expectedQuantity: 2 },
        ]);

        // Test Pack Verification (All items scanned)
        const packAudit = await verifyFlightCasePack({
            flightCaseId: testFlightCaseId,
            scannedTags: [fcTag], // Master single-scan pack
        });
        console.log(`   ✓ Pack Audit: Full Pack = ${packAudit.isFullyPacked}, Total Items: ${packAudit.totalItems}`);
        if (!packAudit.isFullyPacked) throw new Error("Pack audit should be fully packed");

        // Test Return Audit with missing clamp (returned tags empty)
        const returnAudit = await verifyFlightCaseReturn({
            flightCaseId: testFlightCaseId,
            returnedTags: [], // simulate missing everything
            bookingId: testBookingId,
        });
        const totalPenalties = returnAudit.claims.reduce((s, c) => s + c.penaltyFee, 0);
        console.log(`   ✓ Return Audit: Generated ${returnAudit.missingClaimsCount} missing item claim(s), Total Incurred Penalty: ${totalPenalties} QAR`);
        if (returnAudit.missingClaimsCount !== 3 || totalPenalties <= 0) {
            throw new Error(`Return audit should have flagged 3 missing accessories with penalties, got ${returnAudit.missingClaimsCount}`);
        }
        console.log(`✅ [Kit Integrity] Return audit flagged missing accessories and auto-calculated ${totalPenalties} QAR in penalty claims.`);

        console.log("\n===============================================================================");
        console.log("🎉 ALL WMS EXPANSION TESTS PASSED CLEANLY!");
        console.log("===============================================================================");
    } finally {
        // Cleanup in strict foreign key order
        if (testPingId) {
            await db.delete(fleetGpsPings).where(eq(fleetGpsPings.id, testPingId));
        }
        if (testDispatchLogId) {
            await db.delete(bookingDispatchLogs).where(eq(bookingDispatchLogs.id, testDispatchLogId));
        }
        if (testFlightCaseId) {
            await db.delete(kitMissingItemClaims).where(eq(kitMissingItemClaims.flightCaseId, testFlightCaseId));
            await db.delete(flightCaseContents).where(eq(flightCaseContents.flightCaseId, testFlightCaseId));
            await db.delete(flightCases).where(eq(flightCases.id, testFlightCaseId));
        }
        if (testClaimId) {
            await db.delete(damageClaims).where(eq(damageClaims.id, testClaimId));
        }
        if (testWorkOrderId) {
            await db.delete(maintenanceWorkOrders).where(eq(maintenanceWorkOrders.id, testWorkOrderId));
        }
        if (testBookingId) {
            await db.delete(bookingUnitAssignments).where(eq(bookingUnitAssignments.bookingId, testBookingId));
            await db.delete(bookings).where(eq(bookings.id, testBookingId));
        }
        if (testUnitId) {
            await db.delete(inspectionLogs).where(eq(inspectionLogs.unitId, testUnitId));
            await db.delete(inventoryUnits).where(eq(inventoryUnits.id, testUnitId));
        }
    }
}

runWmsExpansionTests()
    .then(() => process.exit(0))
    .catch((err) => {
        console.error("❌ Test failed:", err);
        process.exit(1);
    });
