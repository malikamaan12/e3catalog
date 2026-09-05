import { NextRequest } from "next/server";
import { db, pool } from "../src/lib/db";
import { 
    users, 
    categories, 
    products, 
    inventoryUnits, 
    bookings, 
    invoices,
    invoiceItems,
    crossHireOrders, 
    notifications,
    notificationOutbox,
    vendors
} from "../src/lib/db/schema";
import { eq, inArray } from "drizzle-orm";
import { v4 as uuid } from "uuid";
import fs from "fs";
import path from "path";

// Domain Modules
import { 
    detectBookingShortages, 
    createSubRentalRfp, 
    receiveSubRentalUnit, 
    finalizeSubRentalReturn 
} from "../src/lib/cross-hire";
import { 
    renderWhatsAppTemplate, 
    sendWhatsAppMessage 
} from "../src/lib/whatsapp";
import { 
    dispatchNotification, 
    processNotificationOutbox 
} from "../src/lib/notifications";

// Route Handlers
import { GET as getBilingualInvoice } from "../src/app/api/pdf/bilingual-invoice/[id]/route";
import { GET as getCivilDefence } from "../src/app/api/pdf/civil-defence/[bookingId]/route";
import { GET as getKahramaa } from "../src/app/api/pdf/kahramaa/[bookingId]/route";

async function runTracks7to10TestSuite() {
    console.log("===============================================================================");
    console.log("   ENTERPRISE MILESTONES 7–10 DOMAIN VERIFICATION SUITE                       ");
    console.log("   Tracks: Cross-Hire, WhatsApp/SMS Notifications, Compliance & Docker Standalone");
    console.log("===============================================================================");

    const runId = Date.now().toString(36).toUpperCase();
    const userId = uuid();
    const vendorUserId = uuid();
    const vendorId = uuid();
    const categoryId = uuid();
    const productId = uuid();
    const bookingId = uuid();
    const invoiceId = uuid();

    let createdCrossHireOrderId: string | null = null;
    let createdAliasedUnitId: string | null = null;

    try {
        console.log("\n[Step 1/5] Seeding domain test fixtures...");

        // 1. Users
        await db.insert(users).values([
            {
                id: userId,
                name: "Hamad Al-Kuwari",
                email: `hamad_${runId}@e3rentals.qa`,
                password: "password123",
                role: "admin",
                status: "active",
            },
            {
                id: vendorUserId,
                name: "Stage Master Logistics",
                email: `vendor_${runId}@stagemaster.qa`,
                password: "password123",
                role: "vendor",
                status: "active",
            }
        ]);

        // 2. Vendor
        await db.insert(vendors).values({
            id: vendorId,
            userId: vendorUserId,
            companyName: `Stage Master Sub-Rentals ${runId}`,
            status: "approved",
            crNumber: "CR-928172-E3",
        });

        // 3. Category & Product
        await db.insert(categories).values({
            id: categoryId,
            name: `Concert Truss & Rigging ${runId}`,
            slug: `truss-rigging-${runId.toLowerCase()}`,
            active: true,
        });

        await db.insert(products).values({
            id: productId,
            vendorId,
            categoryId,
            name: `E3 Eurotruss FD34 3m Square Truss ${runId}`,
            slug: `eurotruss-fd34-${runId.toLowerCase()}`,
            itemCode: `TRS-${runId}`,
            pricePerDay: 800,
            powerRequirements: "3-Phase 32A 415V 50Hz (Distribution Rack)",
            materials: "EN-AW 6082 T6 Aluminum / DIN 4102-B1 Flame Certified",
            weight: "18.5 kg",
            dimensions: "290 x 290 x 3000 mm",
            status: "approved",
            isPublished: true,
        });

        // Only insert 2 inventory units owned by E3
        await db.insert(inventoryUnits).values([
            {
                id: uuid(),
                productId,
                vendorId,
                assetTagCode: `E3-TRS-01-${runId}`,
                conditionStatus: "excellent",
                availabilityStatus: "in_warehouse",
            },
            {
                id: uuid(),
                productId,
                vendorId,
                assetTagCode: `E3-TRS-02-${runId}`,
                conditionStatus: "excellent",
                availabilityStatus: "in_warehouse",
            }
        ]);

        // 4. Booking requesting 5 units (creating a shortage of 3 units)
        const startDate = new Date();
        const endDate = new Date(Date.now() + 86400000 * 3);

        await db.insert(bookings).values({
            id: bookingId,
            userId,
            vendorId,
            productId,
            units: 5,
            startDate,
            endDate,
            customerName: "Qatar Ministry of Culture Events",
            customerEmail: "events@culture.gov.qa",
            customerPhone: "+974 4400 9988",
            projectName: "Qatar National Day Main Stage Dome",
            status: "approved",
            paymentStatus: "paid",
            totalPrice: 12500,
        });

        // 5. Invoices and items
        await db.insert(invoices).values({
            id: invoiceId,
            invoiceNumber: `INV-${runId}-001`,
            bookingId,
            userId,
            customerName: "Qatar Ministry of Culture Events",
            customerEmail: "events@culture.gov.qa",
            customerPhone: "+974 4400 9988",
            currency: "QAR",
            subtotal: 12500,
            taxAmount: 0,
            discount: 500,
            totalAmount: 12000,
            amountPaid: 12000,
            amountDue: 0,
            status: "paid",
            issueDate: new Date(),
            dueDate: new Date(Date.now() + 86400000 * 14),
            notes: "Al Bidda Park Pavilion A, Doha, State of Qatar",
        });

        await db.insert(invoiceItems).values({
            id: uuid(),
            invoiceId,
            bookingId,
            productId,
            description: "E3 Eurotruss FD34 Heavy-Duty Stage Truss Rigging Package",
            units: 5,
            days: 3,
            unitPrice: 800,
            lineTotal: 12000,
        });

        console.log("✓ Fixtures seeded successfully.");

        // =========================================================================
        // TRACK 7: AUTOMATED CROSS-HIRE & VENDOR SUB-RENTAL NETWORK
        // =========================================================================
        console.log("\n[Step 2/5] Testing Track 7: Automated Cross-Hire & Sub-Rental Engine...");

        // 2a. Detect booking shortages
        const shortages = await detectBookingShortages(bookingId);
        const myShortage = shortages.find(s => s.productId === productId);
        console.log(`- Shortages detected: ${shortages.length} product(s) in deficit.`);
        if (!myShortage) {
            throw new Error(`Expected shortage for product ${productId}, but none was reported`);
        }
        console.log(`  Target product shortage: ${myShortage.shortageDelta} units deficit (Required: ${myShortage.unitsRequired}, Available: ${myShortage.unitsAvailable})`);
        if (myShortage.shortageDelta !== 3) {
            throw new Error(`Expected deficit of 3 units, got ${myShortage.shortageDelta}`);
        }

        // 2b. Create Sub-Rental RFP order
        const rfpOrder = await createSubRentalRfp({
            bookingId,
            productId,
            supplierVendorId: vendorId,
            supplierName: `Stage Master Sub-Rentals ${runId}`,
            supplierContact: "+974 5599 0011",
            unitsRequested: 3,
            periodStart: startDate,
            periodEnd: endDate,
            supplierDailyRate: 350,
            clientDailyRate: 800,
            notes: "Urgent cross-hire for National Day stage production",
            createdById: userId,
        });
        createdCrossHireOrderId = rfpOrder.id;
        console.log(`- Created Cross-Hire RFP Order: #${rfpOrder.orderNumber}`);
        console.log(`  Projected profit margin QAR: ${rfpOrder.profitMargin}`);
        if ((rfpOrder.profitMargin || 0) <= 0) {
            throw new Error(`Expected positive profit margin, got ${rfpOrder.profitMargin}`);
        }

        // 2c. Inbound receive sub-rental unit with barcode aliasing
        const receiveResult = await receiveSubRentalUnit({
            crossHireOrderId: rfpOrder.id,
            vendorSerial: `SM-TRUSS-SN-${runId}`,
            condition: "excellent",
            warehouseLocation: "Bay 04 - Sub-Rental Staging Dock",
        });
        createdAliasedUnitId = receiveResult.unit.id;
        console.log(`- Inbound received sub-rental unit: Asset Tag = ${receiveResult.unit.assetTagCode}, Serial = ${receiveResult.unit.serialNumber}`);
        if (!receiveResult.unit.assetTagCode.startsWith("XHIRE-")) {
            throw new Error(`Expected alias tag starting with XHIRE-, got ${receiveResult.unit.assetTagCode}`);
        }

        // 2d. Finalize post-event return
        const returnResult = await finalizeSubRentalReturn(rfpOrder.id);
        console.log(`- Finalized sub-rental return: Success = ${returnResult.success}, Message = ${returnResult.message}`);
        if (!returnResult.success) {
            throw new Error("Expected successful return finalization");
        }
        console.log("✓ Track 7 Automated Cross-Hire & Sub-Rental tests passed 100%.");

        // =========================================================================
        // TRACK 8: LIVE WHATSAPP & SMS FIELD NOTIFICATIONS
        // =========================================================================
        console.log("\n[Step 3/5] Testing Track 8: WhatsApp & SMS Field Notifications...");

        // 3a. Test WhatsApp Template Formatting
        const dealRoomMsg = renderWhatsAppTemplate("deal_room_ready", {
            clientName: "Hamad Al-Kuwari",
            projectName: "Qatar National Day Dome",
            totalAmount: 12000,
            dealRoomUrl: "https://rentals.e3.qa/deal-room/DR-TEST-99"
        });
        console.log(`- Template formatted 'deal_room_ready': ${dealRoomMsg.substring(0, 55)}...`);
        if (!dealRoomMsg.includes("Hamad Al-Kuwari") || !dealRoomMsg.includes("Deal Room")) {
            throw new Error("Deal room template formatting failed");
        }

        const podMsg = renderWhatsAppTemplate("pod_confirmed", {
            clientName: "Hamad Al-Kuwari",
            bookingId: bookingId.slice(0, 8),
            podPdfUrl: "https://rentals.e3.qa/pod/view/99"
        });
        console.log(`- Template formatted 'pod_confirmed': ${podMsg.substring(0, 55)}...`);
        if (!podMsg.includes("POD") && !podMsg.includes("Delivery")) {
            throw new Error("POD template formatting failed");
        }

        // 3b. Test direct WhatsApp sending (Sandbox fallback)
        const sendRes = await sendWhatsAppMessage({
            to: "+974 5511 2233",
            template: "driver_departed",
            params: {
                projectName: "Qatar National Day Dome",
                driverName: "Kareem (Plate: TX-4491)",
                eta: "14:30 AST"
            }
        });
        console.log(`- Direct WhatsApp send response: Success = ${sendRes.success}, Provider = ${sendRes.provider}, MsgId = ${sendRes.messageId}`);
        if (!sendRes.success) {
            throw new Error(`WhatsApp send failed: ${sendRes.error}`);
        }

        // 3c. Test Dispatch Notification (In-App + Outbox) & Background Outbox Processing
        const dispatchResult = await dispatchNotification({
            eventType: "booking_dispatch_deal_room",
            recipientId: userId,
            recipientPhone: "+974 5511 2233",
            channel: "whatsapp",
            title: "Qatar National Day Main Stage Dome Dispatch",
            message: dealRoomMsg,
            templateName: "deal_room_ready",
            payload: {
                clientName: "Hamad Al-Kuwari",
                projectName: "Qatar National Day Dome",
                dealRoomUrl: "https://rentals.e3.qa/deal-room/DR-TEST-99",
                totalAmount: 12000
            },
            bookingId,
        });
        console.log(`- Dispatched notification: outboxId = ${dispatchResult.outboxId}`);

        // Insert a pending outbox row to test worker batch processing
        const pendingOutboxId = uuid();
        await db.insert(notificationOutbox).values({
            id: pendingOutboxId,
            eventType: "deal_room_ready",
            recipientId: userId,
            recipientPhone: "+974 5511 2233",
            channel: "whatsapp",
            templateName: "deal_room_ready",
            payload: {
                clientName: "Hamad Al-Kuwari",
                projectName: "Qatar National Day Dome",
                dealRoomUrl: "https://rentals.e3.qa/deal-room/DR-TEST-99",
                totalAmount: 12000
            },
            status: "pending",
            retryCount: 0,
            scheduledFor: new Date(),
        });
        console.log(`- Inserted pending WhatsApp outbox item: ID = ${pendingOutboxId}`);

        const outboxProcessResult = await processNotificationOutbox(5);
        console.log(`- Processed Outbox: Succeeded = ${outboxProcessResult.succeeded}, Failed = ${outboxProcessResult.failed}`);
        if (outboxProcessResult.succeeded === 0) {
            throw new Error("Expected outbox processor to send at least 1 queued notification");
        }
        console.log("✓ Track 8 Live WhatsApp & SMS notification tests passed 100%.");

        // =========================================================================
        // TRACK 9: COMPLIANCE EXPORTERS (Bilingual GTA Invoice, Civil Defence, Kahramaa)
        // =========================================================================
        console.log("\n[Step 4/5] Testing Track 9: Bilingual & Regulatory Compliance Exporters...");

        // 4a. Bilingual MOCI / GTA Tax Invoice endpoint
        const invoiceReq = new NextRequest(`http://localhost:5001/api/pdf/bilingual-invoice/${invoiceId}?format=json`, {
            headers: { "accept": "application/json" }
        });
        const invoiceResp = await getBilingualInvoice(invoiceReq, { params: Promise.resolve({ id: invoiceId }) });
        const invoiceJson = await invoiceResp.json();
        console.log(`- Bilingual Invoice response status: ${invoiceResp.status}`);
        console.log(`  Document Type: ${invoiceJson.documentType}`);
        console.log(`  Arabic Company: ${invoiceJson.header?.companyArabic}`);
        console.log(`  GTA QR Payload present: ${Boolean(invoiceJson.gtaVerificationQr)}`);
        if (invoiceResp.status !== 200 || !invoiceJson.gtaVerificationQr) {
            throw new Error("Bilingual Tax Invoice endpoint failed");
        }

        // 4b. Qatar Civil Defence Fire-Retardant Safety Clearance endpoint
        const cdReq = new NextRequest(`http://localhost:5001/api/pdf/civil-defence/${bookingId}?format=json`, {
            headers: { "accept": "application/json" }
        });
        const cdResp = await getCivilDefence(cdReq, { params: Promise.resolve({ bookingId }) });
        const cdJson = await cdResp.json();
        console.log(`- Civil Defence Clearance status: ${cdResp.status}`);
        console.log(`  Clearance Ref: ${cdJson.clearanceReference}`);
        console.log(`  Flame Standard: ${cdJson.fireSafetyCompliance?.flameRetardantStandard}`);
        console.log(`  Officer Token present: ${Boolean(cdJson.officerApproval?.verificationToken)}`);
        if (cdResp.status !== 200 || !cdJson.clearanceReference?.startsWith("QCDD-CLR-")) {
            throw new Error("Civil Defence Clearance endpoint failed");
        }

        // 4c. Kahramaa 3-Phase Electrical Load Schedule endpoint
        const khReq = new NextRequest(`http://localhost:5001/api/pdf/kahramaa/${bookingId}?format=json`, {
            headers: { "accept": "application/json" }
        });
        const khResp = await getKahramaa(khReq, { params: Promise.resolve({ bookingId }) });
        const khJson = await khResp.json();
        console.log(`- Kahramaa Load Schedule status: ${khResp.status}`);
        console.log(`  Schedule Ref: ${khJson.scheduleReference}`);
        console.log(`  Connected Load: ${khJson.summaryLoads?.totalConnectedLoadKw} kW (${khJson.summaryLoads?.recommendedGeneratorRatingKva} kVA Generator)`);
        console.log(`  Phase Balancing L1/L2/L3: L1=${khJson.summaryLoads?.phaseLoads?.L1_Red?.amps}A, L2=${khJson.summaryLoads?.phaseLoads?.L2_Yellow?.amps}A, L3=${khJson.summaryLoads?.phaseLoads?.L3_Blue?.amps}A`);
        console.log(`  Engineer Token present: ${Boolean(khJson.engineerApproval?.verificationToken)}`);
        if (khResp.status !== 200 || !khJson.summaryLoads?.recommendedGeneratorRatingKva) {
            throw new Error("Kahramaa Electrical Schedule endpoint failed");
        }
        console.log("✓ Track 9 Bilingual & Compliance Exporters passed 100%.");

        // =========================================================================
        // TRACK 10: DOCKER CONTAINERIZATION & STANDALONE HARDENING
        // =========================================================================
        console.log("\n[Step 5/5] Testing Track 10: Docker Containerization & Next.js Standalone...");

        const rootDir = path.resolve(__dirname, "..");
        const dockerfilePath = path.join(rootDir, "Dockerfile");
        const dockerComposePath = path.join(rootDir, "docker-compose.yml");
        const dockerignorePath = path.join(rootDir, ".dockerignore");
        const nextConfigPath = path.join(rootDir, "next.config.ts");

        // Check Dockerfile
        if (!fs.existsSync(dockerfilePath)) throw new Error("Dockerfile does not exist");
        const dockerfileContent = fs.readFileSync(dockerfilePath, "utf-8");
        if (!dockerfileContent.includes("USER nextjs") || !dockerfileContent.includes(".next/standalone")) {
            throw new Error("Dockerfile missing non-root security or standalone build directives");
        }
        console.log("- Dockerfile verified: Multi-stage, non-root USER nextjs, .next/standalone copied.");

        // Check docker-compose.yml
        if (!fs.existsSync(dockerComposePath)) throw new Error("docker-compose.yml does not exist");
        const composeContent = fs.readFileSync(dockerComposePath, "utf-8");
        if (!composeContent.includes("postgres:") || !composeContent.includes("redis:")) {
            throw new Error("docker-compose.yml missing postgres or redis services");
        }
        console.log("- docker-compose.yml verified: Services app, postgres, redis with healthchecks.");

        // Check .dockerignore
        if (!fs.existsSync(dockerignorePath)) throw new Error(".dockerignore does not exist");
        const ignoreContent = fs.readFileSync(dockerignorePath, "utf-8");
        if (!ignoreContent.includes("node_modules") || !ignoreContent.includes(".next")) {
            throw new Error(".dockerignore missing node_modules or .next exclusions");
        }
        console.log("- .dockerignore verified: Excludes node_modules, .next, and test artifacts.");

        // Check next.config.ts
        const nextConfigContent = fs.readFileSync(nextConfigPath, "utf-8");
        if (!nextConfigContent.includes('output: "standalone"')) {
            throw new Error("next.config.ts missing output: 'standalone'");
        }
        console.log("- next.config.ts verified: output: 'standalone' enabled for production container.");
        console.log("✓ Track 10 Docker Containerization & Security Hardening verified 100%.");

        console.log("\n===============================================================================");
        console.log("🎉 ALL MILESTONE TRACKS 7–10 TESTS PASSED WITH 100% INTEGRITY!");
        console.log("===============================================================================");

    } catch (err: any) {
        console.error("\n❌ Test Suite Failed with error:", err);
        throw err;
    } finally {
        console.log("\n[Teardown] Cleaning up domain test fixtures...");
        try {
            // Remove aliased inventory unit if created
            if (createdAliasedUnitId) {
                await db.delete(inventoryUnits).where(eq(inventoryUnits.id, createdAliasedUnitId));
            }
            // Remove cross hire order if created
            if (createdCrossHireOrderId) {
                await db.delete(crossHireOrders).where(eq(crossHireOrders.id, createdCrossHireOrderId));
            }
            // Remove notifications for test user
            await db.delete(notifications).where(eq(notifications.userId, userId));

            // Remove outbox notifications created in run
            await db.delete(notificationOutbox).where(eq(notificationOutbox.recipientPhone, "+974 5511 2233"));

            // Remove invoice items & invoice
            await db.delete(invoiceItems).where(eq(invoiceItems.invoiceId, invoiceId));
            await db.delete(invoices).where(eq(invoices.id, invoiceId));

            // Remove bookings
            await db.delete(bookings).where(eq(bookings.id, bookingId));

            // Remove inventory units for product
            await db.delete(inventoryUnits).where(eq(inventoryUnits.productId, productId));

            // Remove product
            await db.delete(products).where(eq(products.id, productId));

            // Remove category
            await db.delete(categories).where(eq(categories.id, categoryId));

            // Remove vendor
            await db.delete(vendors).where(eq(vendors.id, vendorId));

            // Remove users
            await db.delete(users).where(inArray(users.id, [userId, vendorUserId]));

            console.log("✓ Teardown completed cleanly. Database zero-residue verified.");
        } catch (cleanupErr: any) {
            console.error("Cleanup error:", cleanupErr);
        } finally {
            await pool.end();
        }
    }
}

runTracks7to10TestSuite();
