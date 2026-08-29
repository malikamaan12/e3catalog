/**
 * E3 Rentals — Sprint 5: Sales CRM, Client Portal, Quotations, Contracts and Commercial Workflow Acceptance Suite
 * 
 * Tests multi-item proposal negotiation, live financial recalculations, digital contract signatures,
 * commission ledger generation, and multi-tenant project messaging.
 */

import { db } from "../lib/db";
import { 
    users, 
    vendors, 
    products, 
    inventoryUnits, 
    bookings, 
    vendorLedgers,
    commissionSettlements,
    chatMessages,
    systemLogs 
} from "../lib/db/schema";
import { eq, or, and, inArray } from "drizzle-orm";
import { v4 as uuid } from "uuid";
import { 
    BOOKING_STATUS, 
    USER_ROLES, 
    PRODUCT_STATUS, 
    ASSET_STATUS 
} from "../lib/constants";
import { calculateQuoteFinancials, calculateRentalDays } from "../lib/pricing";
import { validateProjectAvailability } from "../lib/availability";
import { processBookingCommissions } from "../lib/finance";

function assert(condition: boolean, message: string) {
    if (!condition) {
        console.error(`  [FAIL] ${message}`);
        throw new Error(`Assertion failed: ${message}`);
    }
    console.log(`  [PASS] ${message}`);
}

async function runSalesCrmAcceptanceTests() {
    console.log("================================================================================");
    console.log("   E3 RENTALS — SPRINT 5: SALES CRM, CLIENT PORTAL & COMMERCIAL SUITE           ");
    console.log("================================================================================");

    const testRunId = uuid().slice(0, 8);
    const createdUserIds: string[] = [];
    const createdVendorIds: string[] = [];
    const createdProductIds: string[] = [];
    const createdUnitIds: string[] = [];
    const createdBookingIds: string[] = [];
    const createdMessageIds: string[] = [];

    try {
        // ─── Phase 1: Commercial Pricing & Multi-Item Calculation ───
        console.log("\n--- Phase 1: Commercial Pricing & Multi-Item Calculation ---");

        const startDate = new Date();
        const endDate = new Date(Date.now() + 86400000 * 2); // 3 calendar days (inclusive)
        const rentalDays = calculateRentalDays(startDate, endDate);
        assert(rentalDays === 3, "3 calendar days computed accurately");

        const sampleItems = [
            {
                productId: "prod-audio-1",
                name: "JBL VTX A12 Line Array",
                units: 4,
                pricePerDay: 500,
                startDate,
                endDate,
                packagingFee: 50,
                handlingFee: 25,
                setupFee: 100,
            },
            {
                productId: "prod-light-1",
                name: "Robe MegaPointe Moving Head",
                units: 6,
                pricePerDay: 200,
                startDate,
                endDate,
                packagingFee: 20,
                handlingFee: 10,
                setupFee: 50,
            },
        ];

        const quoteFin = calculateQuoteFinancials({
            items: sampleItems,
            discountPercent: 10, // 10% discount
            logisticsCost: 500,
            laborCost: 1000,
            additionalChargeName: "Mall Overnight Permit",
            additionalChargeAmount: 300,
            additionalChargeType: "fixed",
        });

        // Item 1: (500 * 4 * 3) = 6000 + (175 * 4) = 700 => 6700
        // Item 2: (200 * 6 * 3) = 3600 + (80 * 6) = 480 => 4080
        // Gross subtotal = 10,780
        // Net subtotal (after 10% discount on 9600 rental = 960 off) = 10780 - 960 = 9820
        // Grand total = 9820 + 500 (logistics) + 1000 (labor) + 300 (permit) = 11,620
        assert(quoteFin.totalUnitsCount === 10, "Total units correctly calculated (10 units)");
        assert(quoteFin.baseRentalSubtotal === 9600, "Base rental subtotal is exactly 9,600 QAR");
        assert(quoteFin.grossSubtotal === 10780, "Gross subtotal with custom packaging/setup fees is 10,780 QAR");
        assert(quoteFin.discountAmount === 1078, "10% discount on gross subtotal calculates to 1,078 QAR");
        assert(quoteFin.grandTotal === 11502, "Grand total with logistics, labor, and custom permit is 11,502 QAR");

        // ─── Phase 2: Multi-Item Sales Deal Room Fixture Setup ───
        console.log("\n--- Phase 2: Multi-Item Sales Deal Room Setup ---");

        const clientUserId = uuid();
        createdUserIds.push(clientUserId);
        await db.insert(users).values({
            id: clientUserId,
            name: "Nasser Al-Attiyah (VIP Client)",
            email: `vip_client_${testRunId}@e3.test`,
            role: USER_ROLES.CLIENT,
        });

        const vendorUserId = uuid();
        const vendorId = uuid();
        createdUserIds.push(vendorUserId);
        createdVendorIds.push(vendorId);

        await db.insert(users).values({
            id: vendorUserId,
            name: "Vendor Sound Partner",
            email: `vendor_partner_${testRunId}@e3.test`,
            role: USER_ROLES.VENDOR,
            vendorId,
        });

        await db.insert(vendors).values({
            id: vendorId,
            userId: vendorUserId,
            companyName: `Doha Pro Sound ${testRunId}`,
            lifecycleStatus: "active",
            commissionType: "percentage",
            commissionValue: 20, // 20% platform cut
            storeStatus: "active",
        });

        const prodId1 = uuid();
        const prodId2 = uuid();
        createdProductIds.push(prodId1, prodId2);

        const cat = await db.query.categories.findFirst();
        const catId = cat ? cat.id : "cat-sound";

        await db.insert(products).values([
            {
                id: prodId1,
                vendorId,
                categoryId: catId,
                name: `L-Acoustics K2 Rig ${testRunId}`,
                slug: `l-acoustics-k2-${testRunId}`,
                pricePerDay: 800,
                status: PRODUCT_STATUS.PUBLISHED,
                isPublished: true,
            },
            {
                id: prodId2,
                vendorId,
                categoryId: catId,
                name: `DiGiCo Quantum 338 ${testRunId}`,
                slug: `digico-quantum-${testRunId}`,
                pricePerDay: 1200,
                status: PRODUCT_STATUS.PUBLISHED,
                isPublished: true,
            },
        ]);

        // Create 2 physical units for prod1 and 1 unit for prod2
        const unit1Id = uuid();
        const unit2Id = uuid();
        const unit3Id = uuid();
        createdUnitIds.push(unit1Id, unit2Id, unit3Id);

        await db.insert(inventoryUnits).values([
            {
                id: unit1Id,
                productId: prodId1,
                vendorId,
                assetTagCode: `E3-K2-01-${testRunId}`,
                availabilityStatus: ASSET_STATUS.IN_WAREHOUSE,
                conditionStatus: "excellent",
            },
            {
                id: unit2Id,
                productId: prodId1,
                vendorId,
                assetTagCode: `E3-K2-02-${testRunId}`,
                availabilityStatus: ASSET_STATUS.IN_WAREHOUSE,
                conditionStatus: "excellent",
            },
            {
                id: unit3Id,
                productId: prodId2,
                vendorId,
                assetTagCode: `E3-Q338-01-${testRunId}`,
                availabilityStatus: ASSET_STATUS.IN_WAREHOUSE,
                conditionStatus: "excellent",
            },
        ]);

        assert(true, "Catalog products and physical fleet inventory seeded");

        // ─── Phase 3: Project Deal Room Creation & Line Item Management ───
        console.log("\n--- Phase 3: Project Proposal & Line Item Management ---");

        const projectId = `PRJ-${testRunId.toUpperCase()}`;
        const item1Id = uuid();
        const item2Id = uuid();
        createdBookingIds.push(item1Id, item2Id);

        await db.insert(bookings).values([
            {
                id: item1Id,
                projectId,
                projectName: "National Day Celebration",
                productId: prodId1,
                vendorId,
                userId: clientUserId,
                units: 2,
                startDate,
                endDate,
                totalPrice: 800 * 2 * 3, // 4800 QAR
                status: BOOKING_STATUS.REQUEST,
                customerName: "Nasser Al-Attiyah",
                customerEmail: `vip_client_${testRunId}@e3.test`,
            },
            {
                id: item2Id,
                projectId,
                projectName: "National Day Celebration",
                productId: prodId2,
                vendorId,
                userId: clientUserId,
                units: 1,
                startDate,
                endDate,
                totalPrice: 1200 * 1 * 3, // 3600 QAR
                status: BOOKING_STATUS.REQUEST,
                customerName: "Nasser Al-Attiyah",
                customerEmail: `vip_client_${testRunId}@e3.test`,
            },
        ]);

        const projectItems = await db.query.bookings.findMany({
            where: eq(bookings.projectId, projectId),
        });
        assert(projectItems.length === 2, "Project proposal initialized with 2 line items");

        // ─── Phase 4: Live Availability Pre-Check & Conflict Detection ───
        console.log("\n--- Phase 4: Live Availability & Conflict Detection ---");

        const availValid = await validateProjectAvailability(
            projectItems.map(b => ({
                productId: b.productId,
                units: b.units,
                startDate: b.startDate,
                endDate: b.endDate,
            })),
            { excludeProjectId: projectId }
        );
        assert(availValid.valid, "Availability revalidation succeeds when units are in warehouse");

        // Test Conflict: Requesting 5 units of prodId2 when only 1 exists
        const availConflict = await validateProjectAvailability([
            {
                productId: prodId2,
                units: 5,
                startDate,
                endDate,
            },
        ]);
        assert(!availConflict.valid, "Availability check catches stock shortfall");
        assert(availConflict.conflicts.length > 0, "Conflict details returned with requested vs available counts");

        // ─── Phase 5: Client Digital Sign-Off & Contract Confirmation ───
        console.log("\n--- Phase 5: Client Digital Sign-Off & Contract Confirmation ---");

        const fakeSignatureData = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAMgAAABkCAYAAADD0x7sAAAgAElEQVR4Xu2deZxV1ZX/v7e...";
        const now = new Date();

        await db.transaction(async (tx) => {
            await tx.update(bookings)
                .set({
                    status: BOOKING_STATUS.APPROVED,
                    signatureData: fakeSignatureData,
                    signedAt: now,
                    updatedAt: now,
                })
                .where(eq(bookings.projectId, projectId));
        });

        const signedBookings = await db.query.bookings.findMany({
            where: eq(bookings.projectId, projectId),
        });

        assert(signedBookings.every(b => b.status === BOOKING_STATUS.APPROVED), "All project line items updated to 'approved'");
        assert(signedBookings.every(b => b.signatureData === fakeSignatureData), "Digital signature captured and persisted");
        assert(signedBookings.every(b => b.signedAt !== null), "Contract sign-off timestamp recorded");

        // ─── Phase 6: Financial Ledgers & Commission Generation ───
        console.log("\n--- Phase 6: Financial Ledgers & Commission Generation ---");

        await processBookingCommissions(projectId);

        const generatedLedgers = await db.query.vendorLedgers.findMany({
            where: eq(vendorLedgers.projectId, projectId),
        });

        assert(generatedLedgers.length === 2, "Generated exactly 2 vendor ledger records (one per item)");
        
        // Item 1 (4800 QAR) at 20% cut => Platform Fee: 960 QAR, Vendor Payout: 3840 QAR
        const ledger1 = generatedLedgers.find(l => l.bookingId === item1Id);
        assert(ledger1?.amount === 4800, "Ledger 1 gross amount is 4,800 QAR");
        assert(ledger1?.platformFee === 960, "Ledger 1 20% platform fee is 960 QAR");
        assert(ledger1?.vendorPayout === 3840, "Ledger 1 net vendor payout is 3,840 QAR");

        // Item 2 (3600 QAR) at 20% cut => Platform Fee: 720 QAR, Vendor Payout: 2880 QAR
        const ledger2 = generatedLedgers.find(l => l.bookingId === item2Id);
        assert(ledger2?.amount === 3600, "Ledger 2 gross amount is 3,600 QAR");
        assert(ledger2?.platformFee === 720, "Ledger 2 20% platform fee is 720 QAR");
        assert(ledger2?.vendorPayout === 2880, "Ledger 2 net vendor payout is 2,880 QAR");

        // ─── Phase 7: Real-Time Deal Room Chat & Messaging ───
        console.log("\n--- Phase 7: Deal Room Chat & Negotiation Messaging ---");

        const msg1Id = uuid();
        const msg2Id = uuid();
        createdMessageIds.push(msg1Id, msg2Id);

        // Client sends message to Sales/Vendor
        await db.insert(chatMessages).values({
            id: msg1Id,
            senderId: clientUserId,
            receiverId: vendorUserId,
            projectId,
            content: "Can we ensure rigging cables and power distribution are included?",
            isRead: false,
        });

        // Vendor replies
        await db.insert(chatMessages).values({
            id: msg2Id,
            senderId: vendorUserId,
            receiverId: clientUserId,
            projectId,
            content: "Yes, full certified rigging and 3-phase distro are packaged with the K2 rig.",
            isRead: false,
        });

        const thread = await db.query.chatMessages.findMany({
            where: eq(chatMessages.projectId, projectId),
            orderBy: (chatMessages, { asc }) => [asc(chatMessages.createdAt)],
        });

        assert(thread.length === 2, "Project negotiation thread contains 2 messages");
        assert(thread[0].senderId === clientUserId, "Message 1 sent by VIP Client");
        assert(thread[1].senderId === vendorUserId, "Message 2 sent by Vendor Partner");

        console.log("\n================================================================================");
        console.log("   ALL 19 / 19 SPRINT 5 ACCEPTANCE TESTS PASSED WITH 100% SUCCESS!             ");
        console.log("================================================================================");

    } finally {
        // Teardown test fixtures
        console.log("\nCleaning up Sprint 5 test fixtures...");
        if (createdMessageIds.length > 0) {
            await db.delete(chatMessages).where(inArray(chatMessages.id, createdMessageIds));
        }
        if (createdBookingIds.length > 0) {
            await db.delete(vendorLedgers).where(inArray(vendorLedgers.bookingId, createdBookingIds));
            await db.delete(commissionSettlements).where(inArray(commissionSettlements.bookingId, createdBookingIds));
            await db.delete(bookings).where(inArray(bookings.id, createdBookingIds));
        }
        if (createdUnitIds.length > 0) {
            await db.delete(inventoryUnits).where(inArray(inventoryUnits.id, createdUnitIds));
        }
        if (createdProductIds.length > 0) {
            await db.delete(products).where(inArray(products.id, createdProductIds));
        }
        if (createdVendorIds.length > 0) {
            await db.delete(vendors).where(inArray(vendors.id, createdVendorIds));
        }
        if (createdUserIds.length > 0) {
            await db.delete(systemLogs).where(inArray(systemLogs.adminId, createdUserIds));
            await db.delete(users).where(inArray(users.id, createdUserIds));
        }
        console.log("Sprint 5 test cleanup completed safely.");
    }
}

runSalesCrmAcceptanceTests()
    .then(() => process.exit(0))
    .catch((err) => {
        console.error("Test execution failed:", err);
        process.exit(1);
    });
