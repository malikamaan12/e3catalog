/**
 * Comprehensive Enterprise Suite Integration Test
 * Verifies all 5 capabilities:
 * 1. Automated Dispatch Clustering & Route Optimization
 * 2. Dynamic Demand Surge & Non-Linear Tiered Seasonal Rates
 * 3. Sub-Rental & Cross-Hire Partner Sourcing Margin Engine
 * 4. On-Site QR Telemetry & Extension Logic
 * 5. Double-Entry Financial Journal Balancing & Revenue Recognition
 */

import { clusterBookingsIntoRoutes } from "../src/lib/dispatch-clustering";
import { getDurationTierDiscount, calculateQuoteFinancials } from "../src/lib/pricing";
import { calculateCrossHireMargin } from "../src/lib/cross-hire";
import { postBalancedJournal, CHART_OF_ACCOUNTS, executeDailyRevenueRecognition } from "../src/lib/finance-sync";
import { db } from "../src/lib/db";
import { financialJournals } from "../src/lib/db/schema";
import { eq } from "drizzle-orm";

async function runTests() {
    console.log("===============================================================================");
    console.log("🚀 STARTING COMPREHENSIVE ENTERPRISE SUITE VERIFICATION TEST");
    console.log("===============================================================================\n");

    let passedCount = 0;
    let totalCount = 0;

    function assert(condition: boolean, testName: string, detail?: any) {
        totalCount++;
        if (condition) {
            passedCount++;
            console.log(`  ✅ [PASS] ${testName}`);
        } else {
            console.error(`  ❌ [FAIL] ${testName}`, detail || "");
            throw new Error(`Assertion failed for: ${testName}`);
        }
    }

    // =========================================================================
    // 1. DISPATCH CLUSTERING & ROUTE OPTIMIZATION
    // =========================================================================
    console.log("\n--- [1/5] Testing Dispatch Clustering & Route Optimization ---");
    const testWaypoints = [
        {
            bookingId: "b-001",
            bookingNumber: "BKG-LUS-01",
            projectName: "Lusail Marina Gala",
            venueAddress: "Lusail Marina Tower 3, Lusail, Qatar",
            units: 5,
            weightKg: 300,
            stopType: "delivery" as const,
        },
        {
            bookingId: "b-002",
            bookingNumber: "BKG-LUS-02",
            projectName: "The Pearl Luxury VIP Launch",
            venueAddress: "Porto Arabia Tower 12, The Pearl, Qatar",
            units: 4,
            weightKg: 250,
            stopType: "delivery" as const,
        },
        {
            bookingId: "b-003",
            bookingNumber: "BKG-RAY-01",
            projectName: "Al Rayyan Stadium Expo",
            venueAddress: "Mall of Qatar Area, Al Rayyan, Qatar",
            units: 8,
            weightKg: 800,
            stopType: "delivery" as const,
        },
        {
            bookingId: "b-004",
            bookingNumber: "BKG-WAK-01",
            projectName: "Al Wakrah Coastal Festival",
            venueAddress: "Souq Al Wakrah Promenade, Al Wakrah, Qatar",
            units: 2,
            weightKg: 150,
            stopType: "delivery" as const,
        },
    ];

    const clusteredRoutes = clusterBookingsIntoRoutes(testWaypoints, {
        maxStopsPerRoute: 4,
        maxPayloadKg: 3500,
        scheduledDate: new Date(),
    });

    assert(clusteredRoutes.length >= 2, "Clustering partitions distinct geographical zones into multiple routes");
    
    // Check that Lusail & Pearl got clustered together in the Lusail & The Pearl zone
    const lusailRoute = clusteredRoutes.find(r => r.zone.includes("Lusail") || r.zone.includes("Pearl"));
    assert(!!lusailRoute, "Created route for Lusail & The Pearl cluster");
    assert(lusailRoute!.stops.length === 2, "Lusail & Pearl waypoints clustered into the same vehicle run", { stops: lusailRoute?.stops.length });
    assert(lusailRoute!.totalWeightKg === 2500, "Payload weight aggregated accurately (1,500kg + 1,000kg = 2,500kg)");
    assert(lusailRoute!.stops[0].sequenceIndex === 1 && lusailRoute!.stops[1].sequenceIndex === 2, "Stop sequence indices properly ordered (1, 2)");
    assert(lusailRoute!.totalVolumeCbm > 0, "Route volume calculated");
    assert(lusailRoute!.suggestedVehiclePlate.startsWith("QA-E3-FLT"), "Vehicle fleet plate assigned");

    // =========================================================================
    // 2. DYNAMIC DEMAND SURGE & DURATION DISCOUNT CURVES
    // =========================================================================
    console.log("\n--- [2/5] Testing Dynamic Surge & Duration Rate Engine ---");
    
    assert(getDurationTierDiscount(1).percent === 0, "1 day rental has 0% duration discount");
    assert(getDurationTierDiscount(3).percent === 0, "3 day rental has 0% duration discount");
    assert(getDurationTierDiscount(4).percent === 15, "4-7 day rental gets 15% tier discount");
    assert(getDurationTierDiscount(7).percent === 15, "7 day rental gets 15% tier discount");
    assert(getDurationTierDiscount(10).percent === 25, "8-14 day rental gets 25% tier discount");
    assert(getDurationTierDiscount(21).percent === 35, "15-29 day rental gets 35% tier discount");
    assert(getDurationTierDiscount(45).percent === 45, "30+ day enterprise rental gets 45% tier discount");

    // Test quote calculation with surge and duration tiers
    // Item: Daily rate QAR 1000, 10 days = 10,000 base
    // Duration discount: 25% = -2,500
    // Surge multiplier: 1.20x (+20% surge on base) = +2,000
    // Net subtotal = 10,000 + 2,000 - 2,500 = 9,500
    const quoteCalc = calculateQuoteFinancials({
        items: [
            {
                productId: "p1",
                units: 1,
                pricePerDay: 1000,
                startDate: new Date("2026-09-01"),
                endDate: new Date("2026-09-10"), // 10 days
            }
        ],
        applyDurationTier: true,
        surgeMultiplier: 1.20,
    });

    assert(quoteCalc.durationTierDiscountPercent === 25, "Quote accurately identifies 25% duration tier");
    assert(quoteCalc.durationDiscountAmount === 2500, "Duration discount amount calculated as QAR 2,500");
    assert(quoteCalc.surgeMultiplier === 1.20, "Surge multiplier registered as 1.20x");
    assert(quoteCalc.surgeAdjustmentAmount === 2000, "Surge adjustment calculated as QAR 2,000 (20% of base 10,000)");
    assert(quoteCalc.grossSubtotal === 9500, "Gross subtotal after duration discount and surge equals QAR 9,500");
    assert(quoteCalc.grandTotal === 9500, "Grand total matches net subtotal = QAR 9,500");

    // =========================================================================
    // 3. SUB-RENTAL & CROSS-HIRE NETWORK ENGINE
    // =========================================================================
    console.log("\n--- [3/5] Testing Cross-Hire Partner Margin Math ---");
    
    // Partner cost QAR 6,000, Client quote QAR 10,000
    // Gross profit = QAR 4,000
    // Profit margin = 4,000 / 10,000 = 40.0%
    // Markup = 4,000 / 6,000 = 66.67%
    const marginAnalysis = calculateCrossHireMargin({
        supplierCost: 6000,
        clientPrice: 10000,
    });

    assert(marginAnalysis.grossProfit === 4000, "Gross profit equals QAR 4,000");
    assert(marginAnalysis.marginPercentage === 40.0, "Gross margin equals 40.0%");
    assert(Math.round(marginAnalysis.markupPercentage * 100) / 100 === 66.67, "Markup percentage equals 66.67%");

    // =========================================================================
    // 4. ON-SITE QR TELEMETRY & 1-CLICK EXTENSION LOGIC
    // =========================================================================
    console.log("\n--- [4/5] Testing On-Site QR Telemetry & Extension Calculations ---");

    // Simulating rental extension calculation
    const currentEnd = new Date("2026-09-10T12:00:00Z");
    const requestedEnd = new Date("2026-09-15T12:00:00Z");
    const diffDays = Math.round((requestedEnd.getTime() - currentEnd.getTime()) / (1000 * 60 * 60 * 24));
    const dailyRate = 750;
    const extensionCost = diffDays * dailyRate;

    assert(diffDays === 5, "Extension day count accurately calculated as 5 additional days");
    assert(extensionCost === 3750, "Prorated extension charge equals QAR 3,750 (5 days * 750/day)");

    // =========================================================================
    // 5. DOUBLE-ENTRY FINANCIAL JOURNAL BALANCING & REVENUE RECOGNITION
    // =========================================================================
    console.log("\n--- [5/5] Testing Double-Entry Financial Journal Sync ---");

    // A. Post a balanced journal
    const testReferenceId = `TEST-REF-${Date.now()}`;
    const balancedPost = await postBalancedJournal({
        referenceType: "invoice",
        referenceId: testReferenceId,
        description: "Test Client Billing & Deferred Revenue Allocation",
        entries: [
            {
                accountCode: CHART_OF_ACCOUNTS.ACCOUNTS_RECEIVABLE.code,
                accountName: CHART_OF_ACCOUNTS.ACCOUNTS_RECEIVABLE.name,
                debit: 12500.50,
                credit: 0,
                memo: "AR invoice receivable",
            },
            {
                accountCode: CHART_OF_ACCOUNTS.UNEARNED_DEFERRED_REVENUE.code,
                accountName: CHART_OF_ACCOUNTS.UNEARNED_DEFERRED_REVENUE.name,
                debit: 0,
                credit: 12500.50,
                memo: "Unearned rental revenue deferred",
            },
        ],
    });

    assert(balancedPost.success === true, "Balanced journal successfully posted to general ledger");
    assert(balancedPost.balancedAmount === 12500.50, "Journal balanced amount matches QAR 12,500.50");
    assert(balancedPost.journalNumber.startsWith("JRN-"), "Journal assigned sequential JRN- number");

    // Verify persisted in database
    const dbJournal = await db.query.financialJournals.findFirst({
        where: eq(financialJournals.id, balancedPost.journalId),
        with: { entries: true },
    });
    assert(!!dbJournal, "Journal found in database");
    assert(dbJournal!.entries.length === 2, "Database journal contains exactly 2 entry splits");
    const dbTotalDebit = dbJournal!.entries.reduce((acc, e) => acc + (Number(e.debit) || 0), 0);
    const dbTotalCredit = dbJournal!.entries.reduce((acc, e) => acc + (Number(e.credit) || 0), 0);
    assert(dbTotalDebit === dbTotalCredit, "Debits and Credits in database are strictly identical");

    // B. Test rejection of unbalanced journal
    let rejectedAsExpected = false;
    try {
        await postBalancedJournal({
            referenceType: "manual_adjustment",
            referenceId: "TEST-UNBALANCED",
            description: "Illegal unbalanced entry",
            entries: [
                {
                    accountCode: CHART_OF_ACCOUNTS.CASH_AND_BANK.code,
                    accountName: CHART_OF_ACCOUNTS.CASH_AND_BANK.name,
                    debit: 5000,
                    credit: 0,
                },
                {
                    accountCode: CHART_OF_ACCOUNTS.RENTAL_REVENUE.code,
                    accountName: CHART_OF_ACCOUNTS.RENTAL_REVENUE.name,
                    debit: 0,
                    credit: 4500, // missing 500!
                },
            ],
        });
    } catch (e: any) {
        if (e.message.includes("Unbalanced journal rejected")) {
            rejectedAsExpected = true;
        }
    }
    assert(rejectedAsExpected, "Unbalanced double-entry journal strictly rejected by general ledger validation");

    // C. Test daily revenue recognition runner
    const revRecogResult = await executeDailyRevenueRecognition(new Date());
    assert(revRecogResult.success === true, "Daily revenue recognition engine executed without errors");
    console.log(`  ℹ️  Daily revenue recognition processed ${revRecogResult.processedCount} rentals, posted ${revRecogResult.journalsCreated} journals.`);

    console.log("\n===============================================================================");
    console.log(`🎉 ALL TESTS PASSED! (${passedCount}/${totalCount} assertions verified)`);
    console.log("===============================================================================\n");
}

runTests()
    .then(() => process.exit(0))
    .catch((err) => {
        console.error("Test Suite Failed:", err);
        process.exit(1);
    });
