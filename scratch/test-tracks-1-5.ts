import { db } from "../src/lib/db";
import { 
    bookings, products, categories, users, 
    flightCases, flightCaseContents, kitMissingItemClaims,
    eventCrewRoles, bookingCrewAssignments,
    clientCreditHealth, dealRooms, dealRoomAmendments,
    dispatchRoutes, dispatchStops, fleetGpsPings
} from "../src/lib/db/schema";
import { 
    calculateHaversineDistanceKm, detectQatarZone, 
    ingestDriverTelemetryPing, getLiveFleetRadarFeed, QATAR_HUBS 
} from "../src/lib/telemetry-gps";
import { 
    createFlightCase, assignCaseContents, 
    verifyFlightCasePack, verifyFlightCaseReturn, resolveMissingItemClaim, 
    getFlightCaseManifest 
} from "../src/lib/kit-assemblies";
import { 
    ensureDefaultCrewRoles, scheduleCrewShift, 
    detectCrewConflicts, recordCrewTimesheet, generateBookingCallSheet 
} from "../src/lib/crew-scheduling";
import { 
    getPredictiveUtilizationHeatmap, getExecutiveRevParMetrics, 
    auditClientCreditHealth 
} from "../src/lib/fleet-analytics";
import { 
    createOrGetDealRoom, getDealRoomProposal, 
    submitDealRoomAmendment, acceptDealRoomProposal 
} from "../src/lib/deal-room";
import { eq, sql } from "drizzle-orm";
import { v4 as uuidv4 } from "uuid";

async function runTracksTest() {
    console.log("🚀 Starting Tracks 1-5 End-to-End Test Suite...\n");

    let existingBookingId: string;
    const existingBookings = await db.select({ id: bookings.id }).from(bookings).limit(1);
    if (existingBookings.length > 0) {
        existingBookingId = existingBookings[0].id;
    } else {
        existingBookingId = uuidv4();
        await db.insert(bookings).values({
            id: existingBookingId,
            projectName: "Test Qatar National Gala",
            customerName: "Qatar Ministry of Culture",
            customerEmail: "event@moc.gov.qa",
            startDate: new Date(),
            endDate: new Date(Date.now() + 3 * 86400000),
            status: "approved",
            units: 4,
            totalPrice: 24500,
        });
    }

    // ==========================================
    // 🛰️ TRACK 1: GPS TELEMETRY & QATAR RADAR
    // ==========================================
    console.log("━━━ Testing Track 1: Driver GPS Telemetry & Qatar Radar ━━━");
    
    // Distance calculation test
    const distLusailToCorniche = calculateHaversineDistanceKm(
        QATAR_HUBS.LUSAIL.lat, QATAR_HUBS.LUSAIL.lng,
        QATAR_HUBS.CORNICHE.lat, QATAR_HUBS.CORNICHE.lng
    );
    console.log(`✓ Haversine Distance Lusail -> Corniche: ${distLusailToCorniche} km`);
    if (distLusailToCorniche < 10 || distLusailToCorniche > 20) {
        throw new Error(`Distance calculation seems off: ${distLusailToCorniche}`);
    }

    // Zone detection test
    const detectedZone = detectQatarZone(25.4215, 51.5280);
    console.log(`✓ Telemetry point (25.4215, 51.5280) detected zone: "${detectedZone}"`);

    // Telemetry Ping Ingestion
    const pingResult = await ingestDriverTelemetryPing({
        latitude: QATAR_HUBS.WEST_BAY.lat,
        longitude: QATAR_HUBS.WEST_BAY.lng,
        speed: 55,
        batteryPct: 89,
        heading: 180,
        status: "in_transit",
    });
    console.log(`✓ Telemetry Ingestion Recorded: Ping ID ${pingResult.pingId}, ETA: ${pingResult.etaMinutes}m, Zone: ${pingResult.currentZone}`);

    // Radar Feed test
    const radar = await getLiveFleetRadarFeed();
    console.log(`✓ Live Fleet Radar Loaded: ${radar.totalActiveVans} active vans on radar across Qatar hubs`);

    // ==========================================
    // 🧰 TRACK 2: MASTER FLIGHT CASES & KITS
    // ==========================================
    console.log("\n━━━ Testing Track 2: Master Flight Cases & Kit Assemblies ━━━");

    const testCaseTag = `FC-TEST-${Date.now().toString().slice(-4)}`;
    const newCase = await createFlightCase({
        caseNumber: testCaseTag,
        name: "L-Acoustics K2 Amp Rack 16U",
        caseType: "16U Shockmount Rack",
        assetTagCode: `QR-${testCaseTag}`,
        tareWeightKg: 45,
        maxCapacityKg: 120,
        warehouseLocation: "Zone B - Bay 4",
    });
    console.log(`✓ Created Master Flight Case: ${newCase.caseNumber} (Tag: ${newCase.assetTagCode})`);

    // Assign child accessories
    const contents = await assignCaseContents(newCase.id, [
        { accessoryName: "LA12X Powercord True1 32A", expectedQuantity: 2, isPermanentChild: true },
        { accessoryName: "CAT7 EtherCON Neutrik Tour Cable 50m", expectedQuantity: 1, isPermanentChild: false },
        { accessoryName: "Wireless Mic BNC Antenna", expectedQuantity: 4, isPermanentChild: false },
    ]);
    console.log(`✓ Bundled ${contents.length} child accessories into Flight Case ${newCase.caseNumber}`);

    // Single-scan pack verification
    const packResult = await verifyFlightCasePack({
        flightCaseId: newCase.id,
        scannedTags: [`QR-${testCaseTag}`], // Master tag single-scan!
    });
    console.log(`✓ Single-Scan Master Case Pack Verification: Status="${packResult.status}", Fully Packed=${packResult.isFullyPacked}`);

    // Return audit with 1 missing item
    const returnAudit = await verifyFlightCaseReturn({
        flightCaseId: newCase.id,
        returnedTags: ["some-other-tag"], // None returned, triggering missing item claims
        bookingId: existingBookingId,
    });
    console.log(`✓ Return Inspection Audit: Generated ${returnAudit.missingClaimsCount} missing accessory claims`);
    if (returnAudit.missingClaimsCount === 0) throw new Error("Return audit failed to catch missing items");

    // Resolve claim
    const firstClaim = returnAudit.claims[0];
    const resolveResult = await resolveMissingItemClaim(firstClaim.claimId, {
        action: "deducted_from_deposit",
        notes: "Client confirmed item left on site; QAR deducted from cash deposit.",
    });
    console.log(`✓ Missing Accessory Claim Resolved: ID ${resolveResult.claimId} -> ${resolveResult.status}`);

    // Verify manifest query
    const manifest = await getFlightCaseManifest(newCase.id);
    console.log(`✓ Flight Case Manifest Retrieved: ${manifest?.contents.length} items, ${manifest?.claims.length} logged claims`);

    // ==========================================
    // 🎭 TRACK 3: TECHNICAL CREW & LABOR SCHEDULING
    // ==========================================
    console.log("\n━━━ Testing Track 3: Technical Crew & Event Labor Scheduling ━━━");

    await ensureDefaultCrewRoles();
    const allRoles = await db.select().from(eventCrewRoles);
    console.log(`✓ Verified ${allRoles.length} Production Crew Roles loaded`);

    const soundRole = allRoles.find(r => r.code === "FOH_AUDIO") || allRoles[0];

    const callTime = new Date();
    const endTime = new Date(callTime.getTime() + 10 * 3600000); // 10-hour shift (8h standard + 2h overtime)

    const testCrewMember = `Karim Soundmaster ${Date.now().toString().slice(-4)}`;
    const shift = await scheduleCrewShift({
        bookingId: existingBookingId,
        crewName: testCrewMember,
        roleId: soundRole.id,
        callTime,
        endTime,
        venueLocation: "Lusail Multipurpose Hall",
        notes: "Head of Audio for opening ceremony",
    });
    console.log(`✓ Shift Scheduled: ${shift.crewName} (${soundRole.name}) - Standard: ${shift.standardHours}h, OT: ${shift.overtimeHours}h, Cost: QAR ${shift.laborCost}`);

    // Conflict detection check
    const conflictCheck = await detectCrewConflicts(testCrewMember, new Date(callTime.getTime() + 3600000), new Date(endTime.getTime() + 3600000));
    console.log(`✓ Conflict Detection Check: Conflict detected=${conflictCheck.hasConflict} (Expected true for overlapping shift)`);
    if (!conflictCheck.hasConflict) throw new Error("Shift conflict detection failed to catch overlapping shift");

    // Timesheet punch clock
    const timesheet = await recordCrewTimesheet(shift.id, {
        checkInAt: callTime,
        checkOutAt: new Date(callTime.getTime() + 11 * 3600000), // 11 actual hours worked
        status: "completed",
        notes: "Show ran 1 hour late due to encore speech.",
    });
    console.log(`✓ Timesheet Punch Auditor: Actual ${timesheet.actualHours}h, Standard ${timesheet.standardHours}h, OT ${timesheet.overtimeHours}h -> Total Labor Cost: QAR ${timesheet.laborCost}`);

    // Call Sheet Generation
    const callSheet = await generateBookingCallSheet(existingBookingId);
    console.log(`✓ Call Sheet Generated: ${callSheet.documentNumber} for "${callSheet.event.name}" with ${callSheet.totalCrewCount} crew members`);

    // ==========================================
    // 📈 TRACK 4: PREDICTIVE UTILIZATION & REVPAR
    // ==========================================
    console.log("\n━━━ Testing Track 4: Predictive Utilization & Executive RevPAR ━━━");

    const heatmap = await getPredictiveUtilizationHeatmap();
    console.log(`✓ Predictive Shortage Heatmap Computed across ${heatmap.categories.length} categories:`);
    heatmap.categories.slice(0, 3).forEach(c => {
        console.log(`   - ${c.categoryName}: 1-10d (${c.horizons[0].utilizationPct}%), 11-30d (${c.horizons[1].utilizationPct}%)`);
    });

    const revPar = await getExecutiveRevParMetrics();
    console.log(`✓ Executive RevPAR Metrics Generated: Top category "${revPar[0]?.categoryName}" (RevPAR: QAR ${revPar[0]?.revParMonthlyQar}/mo, Status: ${revPar[0]?.status})`);

    const creditAudit = await auditClientCreditHealth({
        clientName: "Al Rayyan Hospitality Group",
        creditLimit: 120000,
        currentOutstanding: 28000,
        averageDaysToPay: 12,
    });
    console.log(`✓ Corporate Client Credit Health Audited: Score ${creditAudit.paymentBehaviorScore}/100, Tier: ${creditAudit.riskTier} ("${creditAudit.recommendation.slice(0, 45)}...")`);

    // ==========================================
    // 🤝 TRACK 5: WHITE-LABEL CLIENT DEAL ROOM
    // ==========================================
    console.log("\n━━━ Testing Track 5: White-Label Client Interactive Deal Room ━━━");

    const room = await createOrGetDealRoom({
        bookingId: existingBookingId,
        customSlug: `test-deal-room-${Date.now().toString().slice(-4)}`,
        title: "Doha International Cultural Gala — Equipment & Crew Proposal",
        branding: {
            clientCompanyName: "Supreme Committee & Qatar Tourism",
            primaryColorHex: "#D4AF37",
            customWelcomeMessage: "Exclusive technical equipment and staging package for your VIP reception.",
        },
    });
    console.log(`✓ Deal Room Initialized: Slug="/deal-room/${room.slug}", Status="${room.status}"`);

    const proposal = await getDealRoomProposal(room.slug);
    console.log(`✓ Public Proposal Loaded: ${proposal.items.length} equipment items, ${proposal.availableAddons.length} interactive add-ons, ${proposal.room.viewCount} views`);

    // Amendment Request
    const amendment = await submitDealRoomAmendment({
        slug: room.slug,
        requestedChanges: [
            { type: "upgrade", item: "Line Array Subwoofers", reason: "Increased attendee count to 1,500" },
        ],
        proposedSubtotal: 28000,
        clientComment: "Please add 2 extra SB28 subwoofers and adjust call time to 13:00.",
    });
    console.log(`✓ Digital Amendment Submitted: ID ${amendment.id}, Status: "${amendment.status}"`);

    // Digital Acceptance & E-Signature Sign-Off
    const acceptResult = await acceptDealRoomProposal({
        slug: room.slug,
        signerName: "Dr. Sheikh Saud Al-Thani",
        signerTitle: "Director of Event Operations",
        signatureDataUrl: "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciPjwvc3ZnPg==",
        selectedAddonIds: ["addon-crew", "addon-standby"],
    });
    console.log(`✓ Proposal Accepted & E-Signed: Signed by ${acceptResult.signerName} (${acceptResult.signerTitle}) at ${acceptResult.signedAt}`);

    console.log("\n🎉 ALL TRACKS 1-5 END-TO-END TESTS PASSED WITH 100% SUCCESS!");
    process.exit(0);
}

runTracksTest().catch(err => {
    console.error("❌ Test failed:", err);
    process.exit(1);
});
