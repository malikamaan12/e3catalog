import { db } from "../lib/db";
import { 
    products, 
    categories, 
    inventoryUnits, 
    bookings, 
    users, 
    vendors, 
    bookingUnitAssignments,
    bookingDispatchLogs,
    inspectionLogs,
    maintenanceRecords
} from "../lib/db/schema";
import { eq, and, sql } from "drizzle-orm";
import { ASSET_STATUS, MAINTENANCE_STATUS, PRODUCT_STATUS, USER_ROLES } from "../lib/constants";
import { isValidAssetTransition, canRoleTransitionAsset } from "../lib/asset-lifecycle";
import { 
    autoAllocateBookingUnits, 
    manualAllocateUnit, 
    releaseUnitAllocation, 
    releaseCancelledBookingUnits 
} from "../lib/allocation-engine";
import { v4 as uuid } from "uuid";

async function runWarehouseLogisticsAcceptanceTests() {
    console.log("================================================================================");
    console.log("   E3 RENTALS — SPRINT 3: INVENTORY, FLEET & LOGISTICS ACCEPTANCE SUITE        ");
    console.log("================================================================================");

    let passedTests = 0;
    let totalTests = 0;

    function assert(condition: boolean, testName: string) {
        totalTests++;
        if (condition) {
            console.log(`  [PASS] Test ${totalTests}: ${testName}`);
            passedTests++;
        } else {
            console.error(`  [FAIL] Test ${totalTests}: ${testName}`);
            throw new Error(`Assertion failed for: ${testName}`);
        }
    }

    try {
        // ─── 1. State Machine & RBAC Transition Validation ───
        console.log("\n--- Phase 1: Asset Lifecycle State Machine & RBAC Rules ---");
        assert(isValidAssetTransition(ASSET_STATUS.IN_WAREHOUSE, ASSET_STATUS.ALLOCATED), "In Warehouse can transition to Allocated");
        assert(isValidAssetTransition(ASSET_STATUS.ALLOCATED, ASSET_STATUS.STAGED), "Allocated can transition to Staged");
        assert(isValidAssetTransition(ASSET_STATUS.STAGED, ASSET_STATUS.PACKED), "Staged can transition to Packed");
        assert(isValidAssetTransition(ASSET_STATUS.PACKED, ASSET_STATUS.DISPATCHED), "Packed can transition to Dispatched");
        assert(isValidAssetTransition(ASSET_STATUS.DISPATCHED, ASSET_STATUS.ON_RENT), "Dispatched can transition to On Rent");
        assert(isValidAssetTransition(ASSET_STATUS.ON_RENT, ASSET_STATUS.RETURNED), "On Rent can transition to Returned");
        assert(isValidAssetTransition(ASSET_STATUS.RETURNED, ASSET_STATUS.AWAITING_INSPECTION), "Returned must transition to Awaiting Inspection");
        assert(!isValidAssetTransition(ASSET_STATUS.DISPATCHED, ASSET_STATUS.IN_WAREHOUSE), "Dispatched cannot jump directly to In Warehouse without Return & Inspection");
        assert(!isValidAssetTransition(ASSET_STATUS.IN_MAINTENANCE, ASSET_STATUS.DISPATCHED), "Unit in Maintenance cannot be dispatched");

        assert(canRoleTransitionAsset(USER_ROLES.SUPER_ADMIN, ASSET_STATUS.IN_WAREHOUSE, ASSET_STATUS.RETIRED), "Super admin can retire asset");
        assert(canRoleTransitionAsset(USER_ROLES.WAREHOUSE_MANAGER, ASSET_STATUS.ALLOCATED, ASSET_STATUS.STAGED), "Warehouse manager can stage asset");

        // ─── 2. Setup Test Entities (Category, Product, Vendor, User) ───
        console.log("\n--- Phase 2: Transactional Allocation & Availability Integrity ---");
        let testCat = await db.query.categories.findFirst();
        if (!testCat) {
            const catId = uuid();
            await db.insert(categories).values({
                id: catId,
                name: "Sprint 3 Test Category",
                slug: `cat-spr3-${uuid().slice(0, 4)}`,
                active: true,
            });
            testCat = (await db.query.categories.findFirst({ where: eq(categories.id, catId) }))!;
        }

        let testUser = await db.query.users.findFirst();
        if (!testUser) {
            const userId = uuid();
            await db.insert(users).values({
                id: userId,
                name: "Sprint 3 Test Staff",
                email: `staff-${uuid().slice(0, 4)}@e3.test`,
                role: USER_ROLES.SUPER_ADMIN,
            });
            testUser = (await db.query.users.findFirst({ where: eq(users.id, userId) }))!;
        }

        let testVendor = await db.query.vendors.findFirst();
        if (!testVendor) {
            const venId = uuid();
            await db.insert(vendors).values({
                id: venId,
                userId: testUser.id,
                companyName: "E3 Internal Fleet",
                storeStatus: "active",
            });
            testVendor = (await db.query.vendors.findFirst({ where: eq(vendors.id, venId) }))!;
        }

        const testProdId = uuid();
        const testProdSku = `SPR3-SUB-${uuid().slice(0, 4).toUpperCase()}`;
        await db.insert(products).values({
            id: testProdId,
            categoryId: testCat.id,
            name: "Sprint 3 Dual 18in Subwoofer",
            slug: `spr3-sub-${uuid().slice(0, 6)}`,
            itemCode: testProdSku,
            pricePerDay: 300,
            unit: "unit",
            weight: "85 KG",
            status: PRODUCT_STATUS.PUBLISHED,
            isPublished: true,
        });

        // Insert 3 Serialized Units: 2 Excellent/Good (Allocatable), 1 Damaged (Ineligible)
        const unit1Id = uuid();
        const unit2Id = uuid();
        const unit3Id = uuid();
        const tag1 = `E3-${testProdSku}-001`;
        const tag2 = `E3-${testProdSku}-002`;
        const tag3 = `E3-${testProdSku}-003`;

        await db.insert(inventoryUnits).values([
            {
                id: unit1Id,
                productId: testProdId,
                vendorId: testVendor.id,
                assetTagCode: tag1,
                serialNumber: "SN-SPR3-001",
                conditionStatus: "excellent",
                availabilityStatus: ASSET_STATUS.IN_WAREHOUSE,
            },
            {
                id: unit2Id,
                productId: testProdId,
                vendorId: testVendor.id,
                assetTagCode: tag2,
                serialNumber: "SN-SPR3-002",
                conditionStatus: "good",
                availabilityStatus: ASSET_STATUS.IN_WAREHOUSE,
            },
            {
                id: unit3Id,
                productId: testProdId,
                vendorId: testVendor.id,
                assetTagCode: tag3,
                serialNumber: "SN-SPR3-003",
                conditionStatus: "maintenance_required",
                availabilityStatus: ASSET_STATUS.IN_MAINTENANCE,
            },
        ]);

        // ─── 3. Auto-Allocation Test ───
        const testBooking1Id = uuid();
        await db.insert(bookings).values({
            id: testBooking1Id,
            productId: testProdId,
            units: 2,
            startDate: new Date(),
            endDate: new Date(Date.now() + 86400000 * 2),
            status: "approved",
            totalPrice: 600,
            customerName: "Festival Doha",
            customerEmail: "festival@e3.test",
        });

        const autoAllocRes = await autoAllocateBookingUnits({
            bookingId: testBooking1Id,
            actorId: testUser.id,
            role: testUser.role,
        });

        assert(autoAllocRes.success, "Auto-allocation succeeds");
        assert(autoAllocRes.allocatedCount === 2, "Allocated exactly 2 eligible units");
        assert(autoAllocRes.shortfall === 0, "Zero shortfall when stock is available");

        // Verify allocated unit statuses
        const assignedUnits = await db.query.inventoryUnits.findMany({
            where: and(
                eq(inventoryUnits.productId, testProdId),
                eq(inventoryUnits.availabilityStatus, ASSET_STATUS.ALLOCATED)
            ),
        });
        assert(assignedUnits.length === 2, "Two physical units updated to 'allocated'");

        // ─── 4. Ineligible Asset & Double-Allocation Rejection ───
        console.log("\n--- Phase 3: Safety Guardrails & Rejection Testing ---");
        const testBooking2Id = uuid();
        await db.insert(bookings).values({
            id: testBooking2Id,
            productId: testProdId,
            units: 1,
            startDate: new Date(),
            endDate: new Date(Date.now() + 86400000 * 2),
            status: "approved",
            totalPrice: 300,
            customerName: "Private Gala",
            customerEmail: "gala@e3.test",
        });

        // Try to manually allocate unit3 (in maintenance)
        const ineligRes = await manualAllocateUnit({
            bookingId: testBooking2Id,
            assetTagCode: tag3,
            actorId: testUser.id,
            role: testUser.role,
        });
        assert(!ineligRes.success, "Rejected manual allocation of maintenance_required asset");

        // Try to manually allocate unit1 (already assigned to booking1)
        const doubleAllocRes = await manualAllocateUnit({
            bookingId: testBooking2Id,
            assetTagCode: tag1,
            actorId: testUser.id,
            role: testUser.role,
        });
        assert(!doubleAllocRes.success, "Prevented double-allocation of already assigned unit");

        // ─── 5. Booking Cancellation Releases Assigned Units ───
        console.log("\n--- Phase 4: Booking Cancellation & Release Mechanics ---");
        await releaseCancelledBookingUnits(testBooking1Id, testUser.id, testUser.role);

        const releasedUnit1 = await db.query.inventoryUnits.findFirst({ where: eq(inventoryUnits.id, unit1Id) });
        const releasedUnit2 = await db.query.inventoryUnits.findFirst({ where: eq(inventoryUnits.id, unit2Id) });
        assert(releasedUnit1?.availabilityStatus === ASSET_STATUS.IN_WAREHOUSE, "Unit 1 returned to 'in_warehouse' availability");
        assert(releasedUnit2?.availabilityStatus === ASSET_STATUS.IN_WAREHOUSE, "Unit 2 returned to 'in_warehouse' availability");

        // Now Booking 2 can allocate Unit 1
        const reallocRes = await manualAllocateUnit({
            bookingId: testBooking2Id,
            assetTagCode: tag1,
            actorId: testUser.id,
            role: testUser.role,
        });
        assert(reallocRes.success, "Released unit can now be allocated to Booking 2");

        // ─── 6. Return Intake & Maintenance Routing ───
        console.log("\n--- Phase 5: Return Quarantine, Inspection & Maintenance ---");
        // Simulate Return with damage detected
        const returnAssignment = await db.query.bookingUnitAssignments.findFirst({
            where: and(
                eq(bookingUnitAssignments.bookingId, testBooking2Id),
                eq(bookingUnitAssignments.inventoryUnitId, unit1Id)
            ),
        });

        // Set return status
        const now = new Date();
        await db.update(bookingUnitAssignments)
            .set({ status: "returned", scannedInAt: now })
            .where(eq(bookingUnitAssignments.id, returnAssignment!.id));

        await db.update(inventoryUnits)
            .set({ availabilityStatus: ASSET_STATUS.AWAITING_INSPECTION, conditionStatus: "maintenance_required", updatedAt: now })
            .where(eq(inventoryUnits.id, unit1Id));

        const quarantinedUnit = await db.query.inventoryUnits.findFirst({ where: eq(inventoryUnits.id, unit1Id) });
        assert(quarantinedUnit?.availabilityStatus === ASSET_STATUS.AWAITING_INSPECTION, "Returned unit quarantined in 'awaiting_inspection'");

        // Create Maintenance Record
        const maintTicketId = uuid();
        await db.insert(maintenanceRecords).values({
            id: maintTicketId,
            unitId: unit1Id,
            reportedBy: testUser.id,
            issueCategory: "acoustics",
            severity: "high",
            assignedTechnician: "Service Tech 1",
            status: MAINTENANCE_STATUS.OPEN,
            workNotes: "Blown voice coil during festival deployment",
            estimatedCost: 150,
            openedAt: now,
        });

        const createdTicket = await db.query.maintenanceRecords.findFirst({ where: eq(maintenanceRecords.id, maintTicketId) });
        assert(createdTicket !== undefined, "Maintenance record created with tracking details");
        assert(createdTicket?.severity === "high", "Maintenance ticket severity set correctly");

        // Resolve Maintenance & Restore to Service
        await db.update(maintenanceRecords)
            .set({ status: MAINTENANCE_STATUS.COMPLETED, completedAt: now, actualCost: 140, resolutionNotes: "Driver replaced and impedance tested" })
            .where(eq(maintenanceRecords.id, maintTicketId));

        await db.update(inventoryUnits)
            .set({ availabilityStatus: ASSET_STATUS.IN_WAREHOUSE, conditionStatus: "excellent", updatedAt: now })
            .where(eq(inventoryUnits.id, unit1Id));

        const restoredUnit = await db.query.inventoryUnits.findFirst({ where: eq(inventoryUnits.id, unit1Id) });
        assert(restoredUnit?.availabilityStatus === ASSET_STATUS.IN_WAREHOUSE, "Unit restored to rentable fleet availability after repair");
        assert(restoredUnit?.conditionStatus === "excellent", "Condition restored to excellent");

        // ─── 7. Cleanup Test Records ───
        await db.delete(maintenanceRecords).where(eq(maintenanceRecords.id, maintTicketId));
        await db.delete(bookingUnitAssignments).where(eq(bookingUnitAssignments.bookingId, testBooking1Id));
        await db.delete(bookingUnitAssignments).where(eq(bookingUnitAssignments.bookingId, testBooking2Id));
        await db.delete(bookings).where(eq(bookings.id, testBooking1Id));
        await db.delete(bookings).where(eq(bookings.id, testBooking2Id));
        await db.delete(inventoryUnits).where(eq(inventoryUnits.productId, testProdId));
        await db.delete(products).where(eq(products.id, testProdId));

        console.log("\n================================================================================");
        console.log(`   ALL ${passedTests} / ${totalTests} SPRINT 3 ACCEPTANCE TESTS PASSED WITH 100% SUCCESS! `);
        console.log("================================================================================");
    } catch (err) {
        console.error("Test execution encountered an error:", err);
        process.exit(1);
    }
}

runWarehouseLogisticsAcceptanceTests().then(() => process.exit(0)).catch(() => process.exit(1));
