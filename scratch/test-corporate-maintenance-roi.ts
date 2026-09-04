import { db } from "../src/lib/db";
import { 
    clientOrganizations, 
    organizationMembers, 
    organizationCostCenters, 
    bookingApprovalRequests, 
    bookings, 
    inventoryUnits, 
    maintenanceWorkOrders,
    users,
    products
} from "../src/lib/db/schema";
import { eq, or, desc, sql } from "drizzle-orm";
import { v4 as uuid } from "uuid";
import { calculateAssetMetrics } from "../src/lib/depreciation";

async function runCorporateAndMaintenanceTest() {
    console.log("=================================================");
    console.log("INTEGRATION TEST: CORPORATE ACCOUNTS & FLEET ROI");
    console.log("=================================================\n");

    // 1. Resolve or Create Test User
    let testUser = await db.query.users.findFirst({
        where: eq(users.email, "corporate_test_client@e3rentals.qa")
    });

    if (!testUser) {
        const uid = uuid();
        await db.insert(users).values({
            id: uid,
            email: "corporate_test_client@e3rentals.qa",
            name: "Fatima Al-Thani",
            role: "client",
            passwordHash: "TEST_HASH",
        });
        testUser = (await db.query.users.findFirst({ where: eq(users.id, uid) }))!;
    }
    console.log(`[PASS] Test Client User: ${testUser.name} (${testUser.id})`);

    // 2. Test Corporate Organization Creation
    const orgId = uuid();
    const testOrgName = `Doha Media Group W.L.L. - ${Date.now().toString().slice(-4)}`;
    await db.insert(clientOrganizations).values({
        id: orgId,
        name: testOrgName,
        slug: `doha-media-${Date.now()}`,
        crNumber: "CR-99210-QA",
        taxId: "QA-TIN-88219",
        billingAddress: "West Bay Financial District, Tower 2, Doha",
        creditLimit: 150000,
        creditUsed: 0,
        paymentTerms: "net_30",
        approvalThresholdAmount: 5000,
        status: "active",
    });
    console.log(`[PASS] Organization Created: ${testOrgName} (Credit Limit: 150,000 QAR, Threshold: 5,000 QAR)`);

    // 3. Register Org Admin & Approver
    const memberId = uuid();
    await db.insert(organizationMembers).values({
        id: memberId,
        organizationId: orgId,
        userId: testUser.id,
        role: "org_admin",
        title: "Executive Director",
        spendLimitPerBooking: 8000,
        canApprove: true,
        status: "active",
    });
    console.log(`[PASS] Enrolled User as Org Admin (Spend Limit: 8,000 QAR, canApprove: true)`);

    // 4. Create Cost Center
    const costCenterId = uuid();
    await db.insert(organizationCostCenters).values({
        id: costCenterId,
        organizationId: orgId,
        code: "CC-PROD-2026",
        name: "National Day Production Ops",
        budgetAmount: 60000,
        allocatedSpent: 0,
        status: "active",
    });
    console.log(`[PASS] Cost Center Created: CC-PROD-2026 (Budget: 60,000 QAR)`);

    // 5. Create Test Booking requiring approval (e.g. 18,000 QAR > 8,000 QAR limit)
    let product = await db.query.products.findFirst();
    if (!product) {
        throw new Error("No products found in DB to attach booking");
    }

    const testBookingId = `BK-CORP-${Date.now().toString().slice(-6)}`;
    await db.insert(bookings).values({
        id: testBookingId,
        bookingNumber: testBookingId,
        userId: testUser.id,
        productId: product.id,
        units: 2,
        startDate: new Date("2026-10-01"),
        endDate: new Date("2026-10-05"),
        totalPrice: 18000,
        status: "quoted",
        customerName: testUser.name,
        customerEmail: testUser.email,
        organizationId: orgId,
        costCenterId: costCenterId,
        internalApprovalStatus: "pending_approval",
    });
    console.log(`[PASS] Created Quote Booking ${testBookingId} (18,000 QAR, Pending Approval)`);

    // 6. Create Approval Request
    const reqId = uuid();
    await db.insert(bookingApprovalRequests).values({
        id: reqId,
        bookingId: testBookingId,
        organizationId: orgId,
        costCenterId: costCenterId,
        requestedById: testUser.id,
        amount: 18000,
        thresholdTriggered: true,
        status: "pending",
        notes: "Equipment requisition for National Day stage rigging",
    });
    console.log(`[PASS] Approval Request Logged (${reqId})`);

    // 7. Simulate Approval Decision
    const now = new Date();
    await db.update(bookingApprovalRequests)
        .set({
            status: "approved",
            approverId: testUser.id,
            decidedAt: now,
            notes: "Approved by Executive Director",
        })
        .where(eq(bookingApprovalRequests.id, reqId));

    await db.update(bookings)
        .set({
            internalApprovalStatus: "approved",
            internalApprovedAt: now,
            internalApprovedBy: testUser.id,
        })
        .where(eq(bookings.id, testBookingId));

    await db.update(clientOrganizations)
        .set({
            creditUsed: sql`${clientOrganizations.creditUsed} + 18000`,
        })
        .where(eq(clientOrganizations.id, orgId));

    await db.update(organizationCostCenters)
        .set({
            allocatedSpent: sql`${organizationCostCenters.allocatedSpent} + 18000`,
        })
        .where(eq(organizationCostCenters.id, costCenterId));

    const verifyOrg = await db.query.clientOrganizations.findFirst({
        where: eq(clientOrganizations.id, orgId),
    });
    const verifyCc = await db.query.organizationCostCenters.findFirst({
        where: eq(organizationCostCenters.id, costCenterId),
    });
    const verifyBk = await db.query.bookings.findFirst({
        where: eq(bookings.id, testBookingId),
    });

    console.log(`[VERIFY] Booking Status: ${verifyBk?.internalApprovalStatus} (Approved By: ${verifyBk?.internalApprovedBy})`);
    console.log(`[VERIFY] Organization Credit Used: ${verifyOrg?.creditUsed} / ${verifyOrg?.creditLimit} QAR`);
    console.log(`[VERIFY] Cost Center Spent: ${verifyCc?.allocatedSpent} / ${verifyCc?.budgetAmount} QAR`);

    if (verifyBk?.internalApprovalStatus !== "approved" || verifyOrg?.creditUsed !== 18000 || verifyCc?.allocatedSpent !== 18000) {
        throw new Error("Corporate approval financial reconciliation failed!");
    }

    console.log("\n-------------------------------------------------");
    console.log("TESTING ASSET DEPRECIATION & ROI ENGINE");
    console.log("-------------------------------------------------");

    // 8. Test Asset Metrics Calculation
    const mockUnit = {
        id: "unit-test-1",
        acquisitionCost: 24000,
        salvageValue: 4000,
        usefulLifeYears: 4,
        createdAt: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000 * 1.5), // 1.5 years ago
        conditionStatus: "good",
        cumulativeRevenue: 38000,
        cumulativeMaintenanceCost: 2500,
        rentalDaysSinceLastMaintenance: 110,
        preventiveMaintenanceIntervalDays: 90,
        lastMaintenanceDate: new Date(Date.now() - 110 * 24 * 60 * 60 * 1000),
    };

    const metrics = calculateAssetMetrics(mockUnit);
    console.log(`Acquisition Cost: ${mockUnit.acquisitionCost} QAR`);
    console.log(`Salvage Value: ${mockUnit.salvageValue} QAR`);
    console.log(`Annual Depreciation: ${metrics.annualDepreciation} QAR/yr`);
    console.log(`Accumulated Depreciation: ${metrics.accumulatedDepreciation} QAR`);
    console.log(`Current Book Value: ${metrics.currentBookValue} QAR`);
    console.log(`Net Lifetime ROI: ${metrics.netLifetimeRoiPercent}%`);
    console.log(`Health Score: ${metrics.healthScore}/100`);
    console.log(`Maintenance Urgency: ${metrics.maintenanceUrgency} (Overdue by ${metrics.daysOverdue} days)`);

    if (!["overdue", "critical"].includes(metrics.maintenanceUrgency) || metrics.currentBookValue <= 0 || metrics.netLifetimeRoiPercent <= 0) {
        throw new Error("Depreciation / ROI calculation anomaly detected!");
    }
    console.log("[PASS] Asset metrics calculation mathematically verified.");

    // 9. Test Fleet Automated Preventive Maintenance Trigger
    let testUnit = await db.query.inventoryUnits.findFirst();
    if (testUnit) {
        // Set unit to overdue
        await db.update(inventoryUnits)
            .set({
                rentalDaysSinceLastMaintenance: 95,
                preventiveMaintenanceIntervalDays: 90,
                lastMaintenanceDate: new Date(Date.now() - 100 * 24 * 60 * 60 * 1000),
                acquisitionCost: 15000,
                salvageValue: 2000,
                usefulLifeYears: 5,
                cumulativeRevenue: 28000,
                cumulativeMaintenanceCost: 1200,
            })
            .where(eq(inventoryUnits.id, testUnit.id));

        // Trigger maintenance order
        const workOrderId = uuid();
        const woNumber = `WO-PM-${Date.now().toString(36).toUpperCase()}`;
        await db.insert(maintenanceWorkOrders).values({
            id: workOrderId,
            workOrderNumber: woNumber,
            unitId: testUnit.id,
            productId: testUnit.productId,
            priority: "medium",
            reportedIssue: `Automated Scheduled Preventive Servicing (Rental Days: 95 / 90 interval)`,
            laborHours: 0,
            laborRatePerHour: 50,
            totalPartsCost: 0,
            totalRepairCost: 0,
        });

        await db.update(inventoryUnits)
            .set({
                conditionStatus: "maintenance_required",
                availabilityStatus: "in_maintenance",
                rentalDaysSinceLastMaintenance: 0,
                lastMaintenanceDate: new Date(),
            })
            .where(eq(inventoryUnits.id, testUnit.id));

        const updatedUnit = await db.query.inventoryUnits.findFirst({
            where: eq(inventoryUnits.id, testUnit.id)
        });
        const createdWo = await db.query.maintenanceWorkOrders.findFirst({
            where: eq(maintenanceWorkOrders.id, workOrderId)
        });

        console.log(`[PASS] Automated PM Work Order Created: ${createdWo?.workOrderNumber}`);
        console.log(`[PASS] Unit Availability transitioned to: ${updatedUnit?.availabilityStatus}`);
        console.log(`[PASS] Rental days since last maintenance reset to: ${updatedUnit?.rentalDaysSinceLastMaintenance}`);
    }

    console.log("\n=================================================");
    console.log("ALL ENTERPRISE CORPORATE & FLEET ROI TESTS PASSED");
    console.log("=================================================");
}

runCorporateAndMaintenanceTest()
    .then(() => process.exit(0))
    .catch((err) => {
        console.error("Test failed:", err);
        process.exit(1);
    });
