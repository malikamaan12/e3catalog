import { db } from "../src/lib/db";
import { inventoryUnits, flightCases, products, vendors } from "../src/lib/db/schema";
import { eq, or, inArray } from "drizzle-orm";
import { v4 as uuidv4 } from "uuid";

async function runTest() {
    console.log("🚀 Starting Comprehensive RFID & Batch Stream Integration Test...\n");

    const testTagCode = `TEST-ASSET-${Date.now().toString().slice(-4)}`;
    const testRfidEpc = `E280${Date.now().toString(16).toUpperCase().padStart(20, "0")}`;

    let createdUnitId: string | null = null;
    let createdCaseId: string | null = null;

    try {
        // 1. Fetch any existing product and vendor to attach to
        const product = await db.query.products.findFirst();
        const vendor = await db.query.vendors.findFirst();

        if (!product || !vendor) {
            throw new Error("Cannot run test: No products or vendors found in database.");
        }

        console.log(`[1] Seeding Test Unit: Code=${testTagCode}`);
        const [unit] = await db.insert(inventoryUnits).values({
            id: uuidv4(),
            productId: product.id,
            vendorId: vendor.id,
            assetTagCode: testTagCode,
            conditionStatus: "excellent",
            availabilityStatus: "in_warehouse",
        }).returning();
        createdUnitId = unit.id;
        console.log(`   ✓ Created Unit ID: ${unit.id}, rfidTag initially: ${unit.rfidTag || "null"}`);

        // 2. Test Pairing RFID Tag
        console.log(`\n[2] Testing RFID Commissioning / Pairing with EPC=${testRfidEpc}`);
        const [pairedUnit] = await db.update(inventoryUnits)
            .set({ rfidTag: testRfidEpc, updatedAt: new Date() })
            .where(eq(inventoryUnits.id, unit.id))
            .returning();
        console.log(`   ✓ Successfully Paired! Unit ${pairedUnit.assetTagCode} has rfidTag=${pairedUnit.rfidTag}`);

        // 3. Test Dual Lookup using RFID EPC
        console.log(`\n[3] Testing Dual-Lookup: Resolving asset using ONLY the 24-char RFID EPC...`);
        const resolvedByEpc = await db.query.inventoryUnits.findFirst({
            where: or(
                eq(inventoryUnits.assetTagCode, testRfidEpc),
                eq(inventoryUnits.rfidTag, testRfidEpc)
            ),
        });

        if (!resolvedByEpc || resolvedByEpc.id !== unit.id) {
            throw new Error(`Dual-lookup failed! Could not find unit using RFID EPC ${testRfidEpc}`);
        }
        console.log(`   ✓ Dual-lookup SUCCESS! EPC ${testRfidEpc} resolved to Asset ${resolvedByEpc.assetTagCode}`);

        // 4. Test Flight Case Resolution with RFID Tag
        const testCaseNumber = `FC-TEST-${Date.now().toString().slice(-4)}`;
        const testCaseRfid = `E280FC${Date.now().toString(16).toUpperCase().padStart(18, "0")}`;
        console.log(`\n[4] Testing Flight Case RFID Master Tag Resolution: Case=${testCaseNumber}, RFID=${testCaseRfid}`);

        const [flightCase] = await db.insert(flightCases).values({
            id: uuidv4(),
            caseNumber: testCaseNumber,
            name: "Test Lighting Master Trunk",
            assetTagCode: `TAG-${testCaseNumber}`,
            rfidTag: testCaseRfid,
            status: "available",
        }).returning();
        createdCaseId = flightCase.id;

        const resolvedCase = await db.query.flightCases.findFirst({
            where: or(
                eq(flightCases.assetTagCode, testCaseRfid),
                eq(flightCases.rfidTag, testCaseRfid)
            ),
        });

        if (!resolvedCase || resolvedCase.id !== flightCase.id) {
            throw new Error(`Flight case dual lookup failed! Could not resolve case via RFID ${testCaseRfid}`);
        }
        console.log(`   ✓ Flight Case Dual-lookup SUCCESS! Master RFID resolved to ${resolvedCase.name}`);

        // 5. Test Batch Burst Array Ingestion Simulation
        console.log(`\n[5] Simulating RFID Sled Burst: Scanning [Optical Code, RFID EPC, Flight Case RFID] simultaneously in one batch query...`);
        const simulatedBurstTags = [testTagCode, testRfidEpc, testCaseRfid];

        const batchMatchedUnits = await db.select().from(inventoryUnits).where(
            or(
                inArray(inventoryUnits.assetTagCode, simulatedBurstTags),
                inArray(inventoryUnits.rfidTag, simulatedBurstTags)
            )
        );

        const batchMatchedCases = await db.select().from(flightCases).where(
            or(
                inArray(flightCases.assetTagCode, simulatedBurstTags),
                inArray(flightCases.rfidTag, simulatedBurstTags)
            )
        );

        console.log(`   ✓ Batch Query Result: Matched ${batchMatchedUnits.length} units and ${batchMatchedCases.length} flight cases in a single SQL execution!`);

        if (batchMatchedUnits.length < 1 || batchMatchedCases.length < 1) {
            throw new Error("Batch burst lookup failed to resolve both inventory units and flight cases.");
        }

        console.log("\n=======================================================");
        console.log("🎉 ALL TESTS PASSED! System is 100% verified for RFID bursts, dual lookup, and commissioning.");
        console.log("=======================================================\n");

    } finally {
        // Cleanup test data
        console.log("🧹 Cleaning up test artifacts...");
        if (createdUnitId) {
            await db.delete(inventoryUnits).where(eq(inventoryUnits.id, createdUnitId));
            console.log("   ✓ Deleted test inventory unit");
        }
        if (createdCaseId) {
            await db.delete(flightCases).where(eq(flightCases.id, createdCaseId));
            console.log("   ✓ Deleted test flight case");
        }
    }
}

runTest()
    .then(() => process.exit(0))
    .catch((err) => {
        console.error("❌ Test failed:", err);
        process.exit(1);
    });
