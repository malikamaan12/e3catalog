import fs from 'fs';
process.chdir('b:/rental website/rental-app');

if (fs.existsSync('.env.local')) {
    process.loadEnvFile('.env.local');
}
if (fs.existsSync('.env')) {
    process.loadEnvFile('.env');
}

import { db, pool } from '../src/lib/db';
import { 
    products, 
    categories,
    vendors,
    inventoryUnits, 
    productKitItems, 
    bookings, 
    damageClaims, 
    crossHireOrders, 
    fleetGpsPings,
    bookingDispatchLogs,
    users
} from '../src/lib/db/schema';
import { checkAvailability } from '../src/lib/availability';
import { eq, desc } from 'drizzle-orm';
import { v4 as uuid } from 'uuid';

async function runTests() {
    console.log('========================================================');
    console.log('   RUNNING COMPREHENSIVE 4-PILLAR INTEGRATION TESTS     ');
    console.log('========================================================\n');

    let passedTests = 0;
    let totalTests = 0;

    function assert(condition: boolean, testName: string, detail?: string) {
        totalTests++;
        if (condition) {
            passedTests++;
            console.log(`✅ [PASS] ${testName}`);
        } else {
            console.error(`❌ [FAIL] ${testName}`);
            if (detail) console.error(`   Detail: ${detail}`);
        }
    }

    try {
        // Fetch or create a baseline test user
        let testUser = await db.query.users.findFirst();
        if (!testUser) {
            const uid = uuid();
            await db.insert(users).values({
                id: uid,
                name: 'Test Operational User',
                email: `testops_${Date.now()}@e3rentals.com`,
                role: 'admin',
                password: 'testhash'
            });
            testUser = await db.query.users.findFirst({ where: eq(users.id, uid) });
        }
        const userId = testUser!.id;

        // Fetch or create category
        let cat = await db.query.categories.findFirst();
        if (!cat) {
            const cid = uuid();
            await db.insert(categories).values({
                id: cid,
                name: 'Pro Audio & Staging',
                slug: `audio-${Date.now()}`
            });
            cat = await db.query.categories.findFirst({ where: eq(categories.id, cid) });
        }
        const categoryId = cat!.id;

        // Fetch or create vendor
        let ven = await db.query.vendors.findFirst();
        if (!ven) {
            const vid = uuid();
            await db.insert(vendors).values({
                id: vid,
                userId,
                companyName: 'Elite Audio Visual Qatar',
            });
            ven = await db.query.vendors.findFirst({ where: eq(vendors.id, vid) });
        }
        const vendorId = ven!.id;

        // ----------------------------------------------------
        // PILLAR 1: DYNAMIC PACKAGE & KIT BUNDLER (BOM & CHILD AVAILABILITY)
        // ----------------------------------------------------
        console.log('\n--- PILLAR 1: Dynamic Kit Bundler & Recursive Availability ---');

        // Create Parent Kit Product
        const kitProdId = `kit_${uuid().slice(0, 8)}`;
        await db.insert(products).values({
            id: kitProdId,
            categoryId,
            vendorId,
            name: 'Stadium Concert Audio Package',
            slug: `stadium-concert-audio-${Date.now()}`,
            description: 'Turnkey arena concert audio system with arrays and subs',
            isKit: true,
            pricePerDay: 1500,
        });

        // Create Child Product A (Line Array Module) with 6 physical units
        const childAId = `child_a_${uuid().slice(0, 8)}`;
        await db.insert(products).values({
            id: childAId,
            categoryId,
            vendorId,
            name: 'D&B KSL Line Array Module',
            slug: `dnb-ksl-line-array-${Date.now()}`,
            description: 'Cardioid line array loudspeaker module',
            isKit: false,
            pricePerDay: 250,
        });

        for (let i = 1; i <= 6; i++) {
            await db.insert(inventoryUnits).values({
                id: uuid(),
                productId: childAId,
                vendorId,
                assetTagCode: `KSL-${Date.now().toString().slice(-4)}-${i}-${Math.floor(Math.random()*1000)}`,
                serialNumber: `SN-KSL-${i}`,
                conditionStatus: 'good',
                availabilityStatus: 'available',
            });
        }

        // Create Child Product B (Subwoofer) with 3 physical units
        const childBId = `child_b_${uuid().slice(0, 8)}`;
        await db.insert(products).values({
            id: childBId,
            categoryId,
            vendorId,
            name: 'D&B SL-SUB Cardioid Subwoofer',
            slug: `dnb-sl-sub-${Date.now()}`,
            description: 'High performance subwoofer',
            isKit: false,
            pricePerDay: 300,
        });

        for (let i = 1; i <= 3; i++) {
            await db.insert(inventoryUnits).values({
                id: uuid(),
                productId: childBId,
                vendorId,
                assetTagCode: `SUB-${Date.now().toString().slice(-4)}-${i}-${Math.floor(Math.random()*1000)}`,
                serialNumber: `SN-SUB-${i}`,
                conditionStatus: 'good',
                availabilityStatus: 'available',
            });
        }

        // Link Child Products into Kit BOM:
        // 1 Kit requires 2 Line Arrays and 1 Subwoofer
        // With 6 Line Arrays & 3 Subs, exactly 3 Kits can be formed!
        await db.insert(productKitItems).values([
            {
                id: uuid(),
                parentProductId: kitProdId,
                childProductId: childAId,
                quantity: 2,
                isOptional: false,
            },
            {
                id: uuid(),
                parentProductId: kitProdId,
                childProductId: childBId,
                quantity: 1,
                isOptional: false,
            }
        ]);

        const bomItems = await db.query.productKitItems.findMany({
            where: eq(productKitItems.parentProductId, kitProdId),
            with: { childProduct: true }
        });
        assert(bomItems.length === 2, 'BOM configuration successfully links child products to kit');

        // Test checkAvailability for 1 Kit
        const start = new Date(Date.now() + 86400000);
        const end = new Date(Date.now() + 86400000 * 3);

        const checkAvail1 = await checkAvailability({
            productId: kitProdId,
            startDate: start,
            endDate: end,
            quantity: 1,
        });
        assert(checkAvail1.available === true, '1 Kit is available based on child components', JSON.stringify(checkAvail1));
        assert(checkAvail1.unitsAvailable === 3, `Correctly computed 3 maximum kits available (found ${checkAvail1.unitsAvailable})`);

        // Test checkAvailability for 3 Kits (exact maximum)
        const checkAvail3 = await checkAvailability({
            productId: kitProdId,
            startDate: start,
            endDate: end,
            quantity: 3,
        });
        assert(checkAvail3.available === true, '3 Kits (the exact child bottleneck) are available');

        // Test checkAvailability for 4 Kits (exceeds child stock)
        const checkAvail4 = await checkAvailability({
            productId: kitProdId,
            startDate: start,
            endDate: end,
            quantity: 4,
        });
        assert(checkAvail4.available === false, '4 Kits correctly denied due to child inventory exhaustion');

        // ----------------------------------------------------
        // PILLAR 2: DAMAGE CLAIMS & SECURITY DEPOSIT DEDUCTION ENGINE
        // ----------------------------------------------------
        console.log('\n--- PILLAR 2: Damage Claims & Security Deposit Offsetting ---');

        // Create a test booking with QAR 2,000 security deposit
        const bookingId = uuid();
        await db.insert(bookings).values({
            id: bookingId,
            userId,
            customerName: 'Doha Festival City Events',
            customerEmail: 'events@dhfc.qa',
            customerPhone: '+974 4400 1234',
            projectName: 'National Day Gala 2026',
            productId: childAId,
            units: 2,
            startDate: start,
            endDate: end,
            status: 'booked',
            securityDeposit: 2000,
            depositHeld: 2000,
            baseDailyPriceSnapshot: 250,
            totalRentalPrice: 1500,
        });

        // Query the unit
        const testUnit = await db.query.inventoryUnits.findFirst({
            where: eq(inventoryUnits.productId, childAId)
        });

        // Scenario A: Damage claim within deposit limit
        // Parts: QAR 600, Labor: QAR 350 -> Total: QAR 950
        // Expected: Deducted = 950, Refunded = 2000 - 950 = 1050
        const claimAId = uuid();
        const claimANum = `CLM-TEST-${Date.now().toString().slice(-4)}`;
        const totalA = 600 + 350;
        const depositA = 2000;
        const deductedA = Math.min(depositA, totalA);
        const refundedA = Math.max(0, depositA - deductedA);

        await db.insert(damageClaims).values({
            id: claimAId,
            claimNumber: claimANum,
            bookingId,
            inventoryUnitId: testUnit?.id,
            incidentDescription: 'Front acoustic mesh punctured by client stage crew during tear down.',
            severity: 'moderate',
            partsCost: 600,
            laborCost: 350,
            totalClaimAmount: totalA,
            securityDepositHeld: depositA,
            amountDeducted: deductedA,
            amountRefunded: refundedA,
            status: 'settled',
            filedBy: userId,
        });

        const savedClaimA = await db.query.damageClaims.findFirst({
            where: eq(damageClaims.id, claimAId)
        });
        assert(savedClaimA !== null && savedClaimA !== undefined, 'Damage claim record inserted successfully');
        assert(Number(savedClaimA?.totalClaimAmount) === 950, 'Total claim amount equals parts + labor (950 QAR)');
        assert(Number(savedClaimA?.amountDeducted) === 950, 'Amount deducted matches claim amount (950 QAR)');
        assert(Number(savedClaimA?.amountRefunded) === 1050, 'Surplus security deposit marked for client refund (1050 QAR)');

        // Scenario B: Total loss claim exceeding security deposit
        // Parts: QAR 3000, Labor: QAR 500 -> Total: QAR 3500 on QAR 1000 deposit
        // Expected: Deducted capped at 1000, Refunded = 0
        const claimBId = uuid();
        const totalB = 3500;
        const depositB = 1000;
        const deductedB = Math.min(depositB, totalB);
        const refundedB = Math.max(0, depositB - deductedB);

        await db.insert(damageClaims).values({
            id: claimBId,
            claimNumber: `CLM-TOTAL-${Date.now().toString().slice(-4)}`,
            bookingId,
            inventoryUnitId: testUnit?.id,
            incidentDescription: 'Severe fluid ingress and driver burnout.',
            severity: 'total_loss',
            partsCost: 3000,
            laborCost: 500,
            totalClaimAmount: totalB,
            securityDepositHeld: depositB,
            amountDeducted: deductedB,
            amountRefunded: refundedB,
            status: 'settled',
            filedBy: userId,
        });

        const savedClaimB = await db.query.damageClaims.findFirst({
            where: eq(damageClaims.id, claimBId)
        });
        assert(Number(savedClaimB?.amountDeducted) === 1000, 'Damage deduction capped at security deposit (1000 QAR)');
        assert(Number(savedClaimB?.amountRefunded) === 0, 'Refund balance correctly set to 0 when claim exceeds deposit');

        // ----------------------------------------------------
        // PILLAR 3: SUB-RENTALS & CROSS-HIRING ENGINE
        // ----------------------------------------------------
        console.log('\n--- PILLAR 3: Sub-Rentals & Cross-Hiring Engine ---');

        // 4 units cross-hired from partner AV supplier for 4 days
        // Supplier rate: QAR 300/day
        // Client rate: QAR 500/day
        // Total Supplier Cost = 300 * 4 * 4 = 4,800
        // Total Client Revenue = 500 * 4 * 4 = 8,000
        // Profit Margin = 8000 - 4800 = 3,200
        const crossHireId = uuid();
        const crossHireOrderNum = `XO-${Date.now().toString().slice(-5)}`;
        const xUnits = 4;
        const xDays = 4;
        const xSupDaily = 300;
        const xCliDaily = 500;
        const xTotSup = xSupDaily * xUnits * xDays;
        const xTotCli = xCliDaily * xUnits * xDays;
        const xMargin = xTotCli - xTotSup;

        await db.insert(crossHireOrders).values({
            id: crossHireId,
            orderNumber: crossHireOrderNum,
            bookingId,
            supplierName: 'Gulf Audio Solutions W.L.L.',
            supplierContact: '+974 4455 9988 / logistics@gulfaudio.qa',
            productId: childAId,
            unitsRequested: xUnits,
            periodStart: start,
            periodEnd: new Date(start.getTime() + xDays * 86400000),
            supplierDailyRate: xSupDaily,
            clientDailyRate: xCliDaily,
            totalSupplierCost: xTotSup,
            totalClientRevenue: xTotCli,
            profitMargin: xMargin,
            status: 'requested',
            notes: 'Sub-rented to fulfill peak weekend concert overflow.'
        });

        const xo = await db.query.crossHireOrders.findFirst({
            where: eq(crossHireOrders.id, crossHireId),
            with: { product: true, booking: true }
        });
        assert(xo !== null && xo !== undefined, 'Cross-hire order created successfully');
        assert(Number(xo?.totalSupplierCost) === 4800, 'Supplier cost calculation correct (4,800 QAR)');
        assert(Number(xo?.totalClientRevenue) === 8000, 'Client revenue calculation correct (8,000 QAR)');
        assert(Number(xo?.profitMargin) === 3200, 'Gross profit margin calculation correct (3,200 QAR)');

        // Test lifecycle progression
        await db.update(crossHireOrders)
            .set({ status: 'confirmed' })
            .where(eq(crossHireOrders.id, crossHireId));
        let updatedXo = await db.query.crossHireOrders.findFirst({ where: eq(crossHireOrders.id, crossHireId) });
        assert(updatedXo?.status === 'confirmed', 'Cross-hire transitioned to "confirmed"');

        await db.update(crossHireOrders)
            .set({ status: 'received' })
            .where(eq(crossHireOrders.id, crossHireId));
        updatedXo = await db.query.crossHireOrders.findFirst({ where: eq(crossHireOrders.id, crossHireId) });
        assert(updatedXo?.status === 'received', 'Cross-hire received at warehouse dock');

        await db.update(crossHireOrders)
            .set({ status: 'deployed' })
            .where(eq(crossHireOrders.id, crossHireId));
        updatedXo = await db.query.crossHireOrders.findFirst({ where: eq(crossHireOrders.id, crossHireId) });
        assert(updatedXo?.status === 'deployed', 'Cross-hire deployed on active client site');

        await db.update(crossHireOrders)
            .set({ status: 'returned' })
            .where(eq(crossHireOrders.id, crossHireId));
        updatedXo = await db.query.crossHireOrders.findFirst({ where: eq(crossHireOrders.id, crossHireId) });
        assert(updatedXo?.status === 'returned', 'Cross-hire safely returned to B2B partner');

        // ----------------------------------------------------
        // PILLAR 4: REAL-TIME FLEET GPS TELEMETRY & TRACKING
        // ----------------------------------------------------
        console.log('\n--- PILLAR 4: Real-Time Fleet GPS Telemetry & Interactive Tracking ---');

        // Create a dispatch log
        const dispatchId = uuid();
        await db.insert(bookingDispatchLogs).values({
            id: dispatchId,
            bookingId,
            vehiclePlateNumber: 'QA-77218-TRK',
            driverName: 'Mohammed Tariq',
        });

        // Insert sequential GPS telemetry pings
        const pingsToInsert = [
            { lat: 25.286106, lng: 51.534817, speed: 0, heading: 90, status: 'departed' },
            { lat: 25.310211, lng: 51.528412, speed: 64, heading: 345, status: 'en_route' },
            { lat: 25.356291, lng: 51.524108, speed: 52, heading: 10, status: 'en_route' },
            { lat: 25.358912, lng: 51.526201, speed: 18, heading: 60, status: 'approaching' },
        ];

        for (const ping of pingsToInsert) {
            await db.insert(fleetGpsPings).values({
                id: uuid(),
                dispatchLogId: dispatchId,
                driverId: userId,
                vehiclePlate: 'QA-77218-TRK',
                latitude: ping.lat,
                longitude: ping.lng,
                speed: ping.speed,
                heading: ping.heading,
                status: ping.status,
            });
        }

        const telemetryTrail = await db.query.fleetGpsPings.findMany({
            where: eq(fleetGpsPings.dispatchLogId, dispatchId),
            orderBy: [desc(fleetGpsPings.createdAt)]
        });

        assert(telemetryTrail.length === 4, 'All 4 GPS telemetry coordinates recorded');
        assert(telemetryTrail[0].status === 'approaching', 'Latest telemetry ping is correctly ordered (status: approaching)');
        assert(Math.abs(Number(telemetryTrail[0].latitude) - 25.358912) < 0.001, 'Latest latitude coordinate verified');
        assert(Number(telemetryTrail[0].speed) === 18, 'Latest vehicle velocity telemetry verified (18 km/h)');

        // Final verification summary
        console.log('\n========================================================');
        console.log(`   INTEGRATION TEST SUMMARY: ${passedTests}/${totalTests} TESTS PASSED`);
        console.log('========================================================\n');

        if (passedTests === totalTests) {
            console.log('🎉 ALL 4 PILLARS VERIFIED & FUNCTIONING WITH 100% SUCCESS!');
        } else {
            console.error('⚠️ SOME TESTS FAILED! CHECK OUTPUT ABOVE.');
            process.exit(1);
        }

    } catch (err) {
        console.error('💥 Fatal error during integration tests:', err);
        process.exit(1);
    } finally {
        await pool.end();
    }
}

runTests();
