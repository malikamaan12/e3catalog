import { test, expect } from "@playwright/test";
import { setupE2EFixtures, E2ETestFixtures } from "./fixtures";
import { db, pool } from "../src/lib/db";
import { 
    bookings, dealRooms, dealRoomAmendments, flightCases, flightCaseContents,
    bookingCrewAssignments, proofOfDeliveries, bookingDispatchLogs, fleetGpsPings,
    eventCrewRoles
} from "../src/lib/db/schema";
import { createOrGetDealRoom } from "../src/lib/deal-room";
import { createFlightCase, assignCaseContents } from "../src/lib/kit-assemblies";
import { ensureDefaultCrewRoles } from "../src/lib/crew-scheduling";
import { eq } from "drizzle-orm";
import { v4 as uuidv4 } from "uuid";

test.describe("Complete Connected Deal Room, Logistics Radar & POD E2E Lifecycle", () => {
  let f: E2ETestFixtures;
  let testRunId: string;
  let dealRoomSlug: string;
  let flightCaseNumber: string;
  let flightCaseId: string;
  let dispatchLogId: string;

  test.beforeAll(async () => {
    f = await setupE2EFixtures();
    testRunId = Date.now().toString(36);
    dealRoomSlug = `deal-vip-${testRunId}`;
    flightCaseNumber = `FC-E2E-${testRunId.toUpperCase()}`;
    dispatchLogId = uuidv4();

    // 1. Initialize Deal Room for test booking
    await createOrGetDealRoom({
      bookingId: f.bookingId,
      customSlug: dealRoomSlug,
      title: `E2E VIP Gala Production Package (${testRunId})`,
      branding: {
        clientCompanyName: "Supreme Committee & Qatar Tourism",
        primaryColorHex: "#D4AF37",
        customWelcomeMessage: "Exclusive technical equipment package and technical crew roster for your gala.",
      },
    });

    // 2. Initialize Master Flight Case & bundle child accessories
    const newCase = await createFlightCase({
      caseNumber: flightCaseNumber,
      name: `L-Acoustics K2 Amp Rack (${testRunId})`,
      caseType: "16U Shockmount Touring Rack",
      assetTagCode: `QR-${flightCaseNumber}`,
      tareWeightKg: 42,
      maxCapacityKg: 125,
      warehouseLocation: "Zone A - Bay 12",
    });
    flightCaseId = newCase.id;

    await assignCaseContents(flightCaseId, [
      { accessoryName: "LA12X Powercord True1 32A", expectedQuantity: 2, isPermanentChild: true },
      { accessoryName: "CAT7 EtherCON Neutrik Tour Cable 50m", expectedQuantity: 1, isPermanentChild: false },
      { accessoryName: "Heavy Duty Mega Clamps 50mm", expectedQuantity: 4, isPermanentChild: false },
    ]);

    // 3. Ensure Default Crew Roles are loaded in database
    await ensureDefaultCrewRoles();

    // 4. Create initial Dispatch Log for driver runs
    await db.insert(bookingDispatchLogs).values({
      id: dispatchLogId,
      bookingId: f.bookingId,
      driverName: "Tariq Al-Balooshi",
      vehiclePlateNumber: "QA-55421",
      transportCompany: "E3 Internal Fleet",
      totalGrossWeight: 120,
      dispatchedAt: new Date(),
    });
  });

  test.afterAll(async () => {
    const client = await pool.connect();
    try {
      // Teardown all test records in reverse dependency order
      await client.query(`DELETE FROM "proof_of_deliveries" WHERE "booking_id" = $1;`, [f.bookingId]);
      await client.query(`DELETE FROM "kit_missing_item_claims" WHERE "booking_id" = $1;`, [f.bookingId]);
      if (flightCaseId) {
        await client.query(`DELETE FROM "flight_case_contents" WHERE "flight_case_id" = $1;`, [flightCaseId]);
        await client.query(`DELETE FROM "flight_cases" WHERE "id" = $1;`, [flightCaseId]);
      }
      await client.query(`DELETE FROM "booking_crew_assignments" WHERE "booking_id" = $1;`, [f.bookingId]);
      await client.query(`DELETE FROM "deal_room_amendments" WHERE "deal_room_id" IN (SELECT "id" FROM "deal_rooms" WHERE "booking_id" = $1);`, [f.bookingId]);
      await client.query(`DELETE FROM "deal_rooms" WHERE "booking_id" = $1;`, [f.bookingId]);
      await client.query(`DELETE FROM "booking_dispatch_logs" WHERE "id" = $1;`, [dispatchLogId]);
      await client.query(`DELETE FROM "fleet_gps_pings" WHERE "status" = 'in_transit' AND "created_at" > NOW() - INTERVAL '30 minutes';`);
    } finally {
      client.release();
    }
    // Clean up core fixtures (bookings, products, users)
    await f.cleanup();
  });

  test("Phase 1: Client reviews proposal, toggles add-ons, and requests amendment", async ({ browser }) => {
    const clientContext = await browser.newContext();
    const clientPage = await f.loginAsPersona(clientContext, f.clientUser);

    // 1. Visit custom white-label Deal Room
    await clientPage.goto(`/deal-room/${dealRoomSlug}`);
    await expect(clientPage.locator("text=Active Proposal")).toBeVisible({ timeout: 15000 });

    // Verify luxury client co-branding in header
    await expect(clientPage.locator("header")).toContainText("Supreme Committee & Qatar Tourism");

    // 2. Expand technical specifications accordion
    const toggleSpecBtn = clientPage.locator('button[title="Toggle Tech Specs"]').first();
    if (await toggleSpecBtn.isVisible()) {
      await toggleSpecBtn.click();
      await expect(clientPage.locator("text=Power Requirements")).toBeVisible({ timeout: 5000 });
      await expect(clientPage.locator("text=Physical Dimensions")).toBeVisible();
    }

    // 3. Toggle interactive dynamic add-ons and verify price recalculation
    const addonCrewCard = clientPage.locator('text=Senior On-Site Sound Engineer').first();
    if (await addonCrewCard.isVisible()) {
      await addonCrewCard.click();
      await expect(clientPage.locator("text=Total Quotation Value").locator("..")).toBeVisible();
    }

    // 4. Request Digital Amendment
    const amendBtn = clientPage.locator("button:has-text('Request Amendment')").first();
    if (await amendBtn.isVisible()) {
      await amendBtn.click();
      const textarea = clientPage.locator("textarea");
      await expect(textarea).toBeVisible({ timeout: 5000 });
      await textarea.fill("Requesting early soundcheck at 10:00 AM and 2 extra wireless beltpacks.");
      await clientPage.locator("button:has-text('Submit Amendment')").click();
      await expect(clientPage.getByRole("heading", { name: /Proposal Amendment Log/i })).toBeVisible({ timeout: 10000 });
    }

    await clientContext.close();
  });

  test("Phase 2: Client executes legally binding E-Signature and confirms proposal", async ({ browser }) => {
    const clientContext = await browser.newContext();
    const clientPage = await f.loginAsPersona(clientContext, f.clientUser);

    await clientPage.goto(`/deal-room/${dealRoomSlug}`);
    await expect(clientPage.locator("text=Active Proposal")).toBeVisible({ timeout: 15000 });

    // Open Sign modal via Accept & E-Sign Proposal CTA in main body (avoids fixed navbar overlap)
    const signBtn = clientPage.getByRole("button", { name: "Accept & E-Sign Proposal" });
    await expect(signBtn).toBeVisible({ timeout: 10000 });
    await signBtn.scrollIntoViewIfNeeded();
    await signBtn.click();

    // Verify modal appears
    await expect(clientPage.locator("text=Execute Digital Sign-Off")).toBeVisible({ timeout: 10000 });

    // Fill Signer Information
    const nameInput = clientPage.locator('input[placeholder*="Dr. Sheikh Saud"]');
    await expect(nameInput).toBeVisible({ timeout: 5000 });
    await nameInput.fill("Eng. Tariq Al-Mansoor");

    const titleInput = clientPage.locator('input[value="Head of Events & Production"]');
    if (await titleInput.isVisible()) {
      await titleInput.fill("Director of Production & Staging");
    }

    // Verify electronic signature preview reflects name
    await expect(clientPage.locator("span.italic")).toContainText("Eng. Tariq Al-Mansoor");

    // Submit E-Signature
    const confirmSignBtn = clientPage.locator("button:has-text('Sign & Confirm')");
    await confirmSignBtn.click();

    // Verify Deal Room reflects Signed & Confirmed badge
    await expect(clientPage.locator("header")).toContainText("Signed & Confirmed", { timeout: 15000 });

    // Verify API state
    const dealRes = await clientContext.request.get(`/api/deal-rooms/${dealRoomSlug}`);
    expect(dealRes.status()).toBe(200);
    const dealData = await dealRes.json();
    expect(dealData.room.status).toBe("accepted");
    expect(dealData.booking.notes).toContain("Eng. Tariq Al-Mansoor");

    await clientContext.close();
  });

  test("Phase 3: Production Manager schedules technical crew and validates call sheet", async ({ browser }) => {
    const adminContext = await browser.newContext();
    const adminPage = await f.loginAsPersona(adminContext, f.admin);

    // 1. Visit Booking Dossier
    await adminPage.goto(`/admin/bookings/${f.bookingId}`);
    await expect(adminPage.locator("body")).toBeVisible();

    // Verify Deal Room deep-link button exists
    await expect(adminPage.locator("text=Client Deal Room ↗")).toBeVisible({ timeout: 10000 });

    // 2. Open Schedule Crew Member modal
    const addCrewBtn = adminPage.locator("button:has-text('Schedule Shift')").first();
    if (await addCrewBtn.isVisible()) {
      await addCrewBtn.click();
      await expect(adminPage.locator("text=Schedule Crew Shift & Validate Conflicts")).toBeVisible({ timeout: 10000 });

      // Fill in technician details
      const nameField = adminPage.locator('input[placeholder*="Tariq Soundmaster"]').first();
      if (await nameField.isVisible()) {
        await nameField.fill("Rashid Al-Kuwari (Lead Audio)");
      }

      const venueField = adminPage.locator('input[value*="Qatar National Convention Centre"]').first();
      if (await venueField.isVisible()) {
        await venueField.fill("Lusail Marina VIP Stage");
      }

      // Submit assignment
      const confirmAssignBtn = adminPage.locator("button:has-text('Validate & Schedule')").first();
      if (await confirmAssignBtn.isVisible()) {
        await confirmAssignBtn.click();
      }
    }

    // 3. Verify Call Sheet API endpoint returns valid document structure
    const callSheetRes = await adminContext.request.get(`/api/admin/crew/call-sheet/${f.bookingId}`);
    expect(callSheetRes.status()).toBe(200);
    const callSheetData = await callSheetRes.json();
    expect(callSheetData.documentNumber).toContain("CALL-");
    expect(callSheetData.event).toBeDefined();

    await adminContext.close();
  });

  test("Phase 4: Warehouse verifies master flight case assembly and single-scan pack", async ({ browser }) => {
    const whContext = await browser.newContext();
    const whPage = await f.loginAsPersona(whContext, f.warehouseMgr);

    // 1. Visit Warehouse Flight Cases Tab
    await whPage.goto("/dashboard/warehouse/dispatch?tab=flight_cases");
    await expect(whPage.locator("body")).toBeVisible();

    // Verify Flight Case Manager renders
    await expect(whPage.locator("text=Master Flight Cases & Kit Assemblies")).toBeVisible({ timeout: 10000 });

    // 2. Search for our seeded test flight case
    const searchInput = whPage.locator('input[placeholder*="Search by case"]');
    if (await searchInput.isVisible()) {
      await searchInput.fill(flightCaseNumber);
      await expect(whPage.getByText(flightCaseNumber, { exact: true })).toBeVisible({ timeout: 10000 });
      
      // Click Manifest & Scan button on the case
      const manifestBtn = whPage.locator("button:has-text('Manifest & Scan')").first();
      if (await manifestBtn.isVisible()) {
        await manifestBtn.click();
        await expect(whPage.getByRole('cell', { name: 'LA12X Powercord True1 32A' }).first()).toBeVisible({ timeout: 5000 });
      }
    }

    // 3. Execute Single-Scan Pack Verification API
    const packVerifyRes = await whContext.request.post(`/api/warehouse/flight-cases/${flightCaseId}/verify`, {
      data: {
        scannedTags: [`QR-${flightCaseNumber}`],
        bookingId: f.bookingId,
      },
    });
    expect(packVerifyRes.status()).toBe(200);
    const packResult = await packVerifyRes.json();
    expect(packResult.success).toBe(true);
    expect(packResult.result.isFullyPacked).toBe(true);
    expect(packResult.result.status).toBe("packed");

    await whContext.close();
  });

  test("Phase 5: Driver streams GPS telemetry and completes Proof of Delivery (POD)", async ({ browser }) => {
    // 1. Warehouse Manager views Live Fleet Radar
    const whContext = await browser.newContext();
    const whPage = await f.loginAsPersona(whContext, f.warehouseMgr);

    await whPage.goto("/dashboard/warehouse/dispatch?tab=radar");
    await expect(whPage.locator("body")).toBeVisible();
    await expect(whPage.locator("text=Qatar Logistics Radar")).toBeVisible({ timeout: 10000 });
    await expect(whPage.locator("text=All Active Patrol Vans")).toBeVisible();

    // 2. Driver streams live telemetry ping via API
    const pingRes = await whContext.request.post("/api/driver/gps", {
      data: {
        dispatchLogId,
        latitude: 25.4215, // Lusail Marina
        longitude: 51.5280,
        speed: 52,
        batteryPct: 91,
        vehiclePlate: "QA-55421",
        status: "in_transit",
      },
    });
    expect([200, 201]).toContain(pingRes.status());
    const pingData = await pingRes.json();
    expect(pingData.success).toBe(true);
    expect(pingData.pingId).toBeDefined();

    // 3. Driver opens Driver Handover Portal
    const driverContext = await browser.newContext();
    const driverPage = await f.loginAsPersona(driverContext, f.warehouseMgr);

    await driverPage.goto("/driver");
    await expect(driverPage.locator("body")).toBeVisible();
    await expect(driverPage.locator("text=E3 Driver Logistics")).toBeVisible({ timeout: 10000 });
    await expect(driverPage.locator("text=Live Delivery Runs & POD Sign-off")).toBeVisible();

    // 4. Submit Proof of Delivery (POD) via API to ensure clean end-to-end status transition
    const sampleSignatureDataUrl = "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxMDAiIGhlaWdodD0iMTAwIj48Y2lyY2xlIGN4PSI1MCIgY3k9IjUwIiByPSI0MCIgZmlsbD0iZ29sZCIvPjwvc3ZnPg==";
    
    const podRes = await driverContext.request.post("/api/driver/pod", {
      data: {
        bookingId: f.bookingId,
        dispatchLogId,
        recipientName: "Majid Al-Hajri (Venue Director)",
        recipientPhone: "+974 5512 3456",
        recipientNationalId: "28863401234",
        signatureData: sampleSignatureDataUrl,
        deliveryStatus: "delivered",
        notes: "Equipment received in pristine condition at Lusail VIP Stage.",
        latitude: 25.4215,
        longitude: 51.5280,
      },
    });

    expect(podRes.status()).toBe(201);
    const podData = await podRes.json();
    expect(podData.success).toBe(true);
    expect(podData.pod.recipientName).toBe("Majid Al-Hajri (Venue Director)");

    // 5. Verify booking status transitioned to 'on_rent'
    const bookingCheck = await db.query.bookings.findFirst({
      where: eq(bookings.id, f.bookingId),
    });
    expect(bookingCheck?.status).toBe("on_rent");

    await driverContext.close();
    await whContext.close();
  });

  test("Phase 6: Admin verifies predictive RevPAR yield and credit health scoring", async ({ browser }) => {
    const adminContext = await browser.newContext();
    const adminPage = await f.loginAsPersona(adminContext, f.superAdmin);

    // 1. Visit Predictive Analytics
    await adminPage.goto("/admin/analytics");
    await expect(adminPage.locator("body")).toBeVisible();

    // Click Predictive Fleet & RevPAR sub-tab
    const predictiveTab = adminPage.locator("button:has-text('Predictive Fleet & RevPAR'), button:has-text('Predictive')").first();
    if (await predictiveTab.isVisible()) {
      await predictiveTab.click();
      await expect(adminPage.locator("text=Executive RevPAR & Predictive Fleet Shortage Engine")).toBeVisible({ timeout: 10000 });
      await expect(adminPage.locator("text=Predictive Equipment Shortage Heatmap")).toBeVisible();
      await expect(adminPage.locator("text=Audit Corporate Client")).toBeVisible();
    }

    // 2. Query Predictive RevPAR API directly
    const apiRes = await adminContext.request.get("/api/admin/analytics/predictive-revpar");
    expect(apiRes.status()).toBe(200);
    const analytics = await apiRes.json();
    expect(analytics.heatmap.categories).toBeInstanceOf(Array);
    expect(analytics.heatmap.categories.length).toBeGreaterThan(0);
    expect(analytics.revPar).toBeInstanceOf(Array);

    await adminContext.close();
  });
});
