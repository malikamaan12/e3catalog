import { db } from "../src/lib/db";
import { 
    vendorWarehouses, 
    warehouseZones, 
    inventoryUnits, 
    products, 
    bookings,
    users
} from "../src/lib/db/schema";
import { eq, like } from "drizzle-orm";
import crypto from "crypto";

const WAREHOUSE_ID = "9300db24-4419-4722-944c-fbb7c6bb2770";

async function seedWarehouseItemsAndBookings() {
    console.log("===============================================================================");
    console.log("🚀 SEEDING REAL INVENTORY ITEMS FOR INDUSTRIAL AREA 01 & DEMO BOOKINGS");
    console.log("===============================================================================\n");

    // 1. Fetch Warehouse & Zones
    const warehouse = await db.query.vendorWarehouses.findFirst({
        where: eq(vendorWarehouses.id, WAREHOUSE_ID),
    });
    if (!warehouse) {
        throw new Error("Industrial Area 01 warehouse not found!");
    }
    console.log(`🏢 Found Warehouse: ${warehouse.name} (${warehouse.id})`);

    const zones = await db.select().from(warehouseZones).where(eq(warehouseZones.warehouseId, WAREHOUSE_ID));
    const audioZone = zones.find(z => z.name.includes("Audio")) || zones[0];
    const lightingZone = zones.find(z => z.name.includes("Lighting")) || zones[1];
    const riggingZone = zones.find(z => z.name.includes("Rigging") || z.name.includes("Staging")) || zones[2];
    const ledZone = zones.find(z => z.name.includes("LED") || z.name.includes("Video")) || zones[3];

    console.log("📍 Mapped Zones:");
    console.log(`   - Audio Zone: ${audioZone?.name} (${audioZone?.id})`);
    console.log(`   - Lighting Zone: ${lightingZone?.name} (${lightingZone?.id})`);
    console.log(`   - Rigging Zone: ${riggingZone?.name} (${riggingZone?.id})`);
    console.log(`   - LED Zone: ${ledZone?.name} (${ledZone?.id})\n`);

    // 2. Fetch or create real products to assign
    const allProducts = await db.select().from(products);
    const lineArrayProd = allProducts.find(p => p.name.includes("Line Array") || p.name.includes("J-Series")) || allProducts[0];
    const subProd = allProducts.find(p => p.name.includes("Subwoofer") || p.name.includes("Sprint")) || allProducts[1];
    const sharpyProd = allProducts.find(p => p.name.includes("Sharpy") || p.name.includes("Moving Head")) || allProducts[2];
    const parCanProd = allProducts.find(p => p.name.includes("PAR Can") || p.name.includes("LED PAR")) || allProducts[3];
    const motorProd = allProducts.find(p => p.name.includes("Lodestar") || p.name.includes("Chain Motor")) || allProducts[4];
    const trussProd = allProducts.find(p => p.name.includes("Truss") || p.name.includes("Aluminum")) || allProducts[5];
    const distBoardProd = allProducts.find(p => p.name.includes("Distribution") || p.name.includes("Socapex")) || allProducts[6];

    console.log("📦 Key Products Selected for Slotting:");
    console.log(`   - ${lineArrayProd?.name} (${lineArrayProd?.id})`);
    console.log(`   - ${subProd?.name} (${subProd?.id})`);
    console.log(`   - ${sharpyProd?.name} (${sharpyProd?.id})`);
    console.log(`   - ${parCanProd?.name} (${parCanProd?.id})`);
    console.log(`   - ${motorProd?.name} (${motorProd?.id})`);
    console.log(`   - ${trussProd?.name} (${trussProd?.id})\n`);

    // 3. Keep existing units and create actual equipment units mapped directly to Racks & Tiers
    console.log("📥 Creating and assigning real inventory units to physical racks...");

    // 4. Create actual equipment units mapped directly to Racks & Tiers
    console.log("📥 Creating and assigning real inventory units to physical racks...");

    const unitsToInsert: any[] = [];

    // Helper to generate unit
    const createUnit = (
        rackCode: string,
        tierNum: number,
        slotLetter: string,
        product: any,
        zone: any,
        serialPrefix: string,
        index: number,
        condition: string = "excellent",
        status: string = "in_warehouse"
    ) => {
        const assetTag = `E3-${rackCode}-U${String(index).padStart(3, "0")}`;
        const rfid = `RFID-${rackCode}-T${tierNum}-${slotLetter}-${String(index).padStart(3, "0")}`;
        const serial = `${serialPrefix}-${rackCode}-${String(1000 + index)}`;
        const shelfLoc = `${rackCode}-T${tierNum}-${slotLetter}`;

        return {
            id: crypto.randomUUID(),
            productId: product.id,
            vendorId: warehouse.vendorId || product.vendorId || "VND-PRO-AUDIO",
            warehouseId: WAREHOUSE_ID,
            zoneId: zone?.id || null,
            binId: null,
            shelfLocation: shelfLoc,
            assetTagCode: assetTag,
            rfidTag: rfid,
            serialNumber: serial,
            conditionStatus: condition,
            availabilityStatus: status,
            firmwareVersion: "v4.2.1-PRO",
            totalHoursUsed: Math.floor(Math.random() * 450) + 50,
            lastInspectionDate: new Date(),
            notes: `Stored in ${rackCode} Tier ${tierNum} Slot ${slotLetter}. Calibrated & certified.`,
            createdAt: new Date(),
            updatedAt: new Date(),
        };
    };

    // RCK-AUD-01: 18 units of Line Array d&b J-Series (72% capacity)
    for (let t = 1; t <= 4; t++) {
        const unitsInTier = t === 4 ? 3 : 5; // Total 18
        for (let i = 1; i <= unitsInTier; i++) {
            unitsToInsert.push(createUnit("RCK-AUD-01", t, String.fromCharCode(64 + i), lineArrayProd, audioZone, "DB-JSER", (t - 1) * 5 + i));
        }
    }

    // RCK-AUD-02: 12 units of Dual 18in Subwoofers (48% capacity)
    for (let t = 1; t <= 4; t++) {
        for (let i = 1; i <= 3; i++) {
            unitsToInsert.push(createUnit("RCK-AUD-02", t, String.fromCharCode(64 + i), subProd, audioZone, "SUB-18D", (t - 1) * 3 + i));
        }
    }

    // RCK-AUD-03: 14 units of Audio Distribution & Stage Boxes (56% capacity)
    for (let t = 1; t <= 4; t++) {
        const unitsInTier = t <= 2 ? 4 : 3;
        for (let i = 1; i <= unitsInTier; i++) {
            unitsToInsert.push(createUnit("RCK-AUD-03", t, String.fromCharCode(64 + i), distBoardProd, audioZone, "SOC-32A", (t - 1) * 4 + i));
        }
    }

    // RCK-AUD-04: 2 units (8% capacity - Low Turnover Dead Spot)
    unitsToInsert.push(createUnit("RCK-AUD-04", 1, "A", subProd, audioZone, "SUB-LEG", 1, "good"));
    unitsToInsert.push(createUnit("RCK-AUD-04", 1, "B", subProd, audioZone, "SUB-LEG", 2, "good"));

    // RCK-LGT-01: 20 units of Sharpy 350W Moving Heads (80% capacity - Fast Track)
    for (let t = 1; t <= 4; t++) {
        for (let i = 1; i <= 5; i++) {
            unitsToInsert.push(createUnit("RCK-LGT-01", t, String.fromCharCode(64 + i), sharpyProd, lightingZone, "SHRP-350", (t - 1) * 5 + i));
        }
    }

    // RCK-LGT-02: 15 units of LED PAR Cans RGBWA 18x18W (60% capacity)
    for (let t = 1; t <= 4; t++) {
        const unitsInTier = t === 4 ? 3 : 4;
        for (let i = 1; i <= unitsInTier; i++) {
            unitsToInsert.push(createUnit("RCK-LGT-02", t, String.fromCharCode(64 + i), parCanProd, lightingZone, "PAR-18X", (t - 1) * 4 + i));
        }
    }

    // RCK-LGT-03: 8 units of Moving Heads (32% capacity)
    for (let t = 1; t <= 4; t++) {
        for (let i = 1; i <= 2; i++) {
            unitsToInsert.push(createUnit("RCK-LGT-03", t, String.fromCharCode(64 + i), sharpyProd, lightingZone, "SHRP-350B", (t - 1) * 2 + i));
        }
    }
    // RCK-LGT-04: 0 units (100% EMPTY ready for incoming putaway)

    // RCK-RIG-01: 16 units of CM Lodestar 1-Tonne Chain Motors (64% capacity)
    for (let t = 1; t <= 4; t++) {
        for (let i = 1; i <= 4; i++) {
            unitsToInsert.push(createUnit("RCK-RIG-01", t, String.fromCharCode(64 + i), motorProd, riggingZone, "CML-1T", (t - 1) * 4 + i));
        }
    }

    // RCK-RIG-02: 10 units of Aluminum Box Truss 2m (40% capacity)
    for (let t = 1; t <= 4; t++) {
        const unitsInTier = t <= 2 ? 3 : 2;
        for (let i = 1; i <= unitsInTier; i++) {
            unitsToInsert.push(createUnit("RCK-RIG-02", t, String.fromCharCode(64 + i), trussProd, riggingZone, "TRS-BOX2M", (t - 1) * 3 + i));
        }
    }

    // Clean up any previously inserted E3-IA01 and E3-RCK units
    await db.delete(inventoryUnits).where(like(inventoryUnits.assetTagCode, "E3-IA01-%"));
    await db.delete(inventoryUnits).where(like(inventoryUnits.assetTagCode, "E3-RCK-%"));

    // Insert all units in chunks of 25
    for (let i = 0; i < unitsToInsert.length; i += 25) {
        const chunk = unitsToInsert.slice(i, i + 25);
        await db.insert(inventoryUnits).values(chunk);
    }
    console.log(`   ✅ Successfully inserted ${unitsToInsert.length} actual serialized equipment units across all racks!\n`);

    // 5. Create 5 DEMO Bookings across different lifecycle stages
    console.log("📋 Seeding 5 Demo Bookings across multiple lifecycle stages...");

    // Find a client user to attach bookings to
    const clientUser = await db.query.users.findFirst({
        where: eq(users.email, "client@e3rentals.com"),
    }) || await db.query.users.findFirst();

    const vendorId = "VND-PRO-AUDIO";

    // Delete previous demo bookings if any
    await db.delete(bookings).where(like(bookings.projectName, "%[DEMO]%"));

    const now = new Date();
    const demoBookings = [
        {
            id: "demo-booking-01-request",
            vendorId: vendorId,
            productId: lineArrayProd.id,
            units: 8,
            startDate: new Date(now.getTime() + 7 * 24 * 3600 * 1000), // in 7 days
            endDate: new Date(now.getTime() + 10 * 24 * 3600 * 1000),
            status: "request",
            paymentStatus: "unpaid",
            fulfillmentStatus: "pending",
            userId: clientUser?.id || null,
            projectId: "PROJ-DEMO-01",
            projectName: "[DEMO] Doha Film Festival 2026 Red Carpet & Gala",
            customerName: "Q-Live Productions W.L.L. (Producer Sarah)",
            customerEmail: "sarah.kuwari@qlive.qa",
            customerPhone: "+974 5511 2233",
            totalPrice: 42500,
            discount: 0,
            logisticsCost: 2500,
            laborCost: 4000,
            notes: "Stage 1: Initial quotation requested for 3-day outdoor red carpet screening and gala sound setup.",
            adminNotes: "Client requested technical walkthrough and preliminary quote proposal.",
            createdAt: new Date(now.getTime() - 2 * 3600 * 1000),
            updatedAt: new Date(now.getTime() - 2 * 3600 * 1000),
        },
        {
            id: "demo-booking-02-quote-sent",
            vendorId: vendorId,
            productId: sharpyProd.id,
            units: 16,
            startDate: new Date(now.getTime() + 5 * 24 * 3600 * 1000), // in 5 days
            endDate: new Date(now.getTime() + 8 * 24 * 3600 * 1000),
            status: "quote_sent",
            paymentStatus: "unpaid",
            fulfillmentStatus: "pending",
            userId: clientUser?.id || null,
            projectId: "PROJ-DEMO-02",
            projectName: "[DEMO] Lusail Winter Wonderland VIP Pavilion",
            customerName: "Qatar Media & Entertainment Group (Dana)",
            customerEmail: "dana.khatib@qatarmedia.qa",
            customerPhone: "+974 6622 3344",
            totalPrice: 28800,
            discount: 1800,
            logisticsCost: 1500,
            laborCost: 3500,
            notes: "Stage 2: Official quote proposal sent with 16x Sharpy 350W moving beams and Net-30 enterprise terms.",
            adminNotes: "Waiting for client finance controller sign-off.",
            createdAt: new Date(now.getTime() - 12 * 3600 * 1000),
            updatedAt: new Date(now.getTime() - 6 * 3600 * 1000),
        },
        {
            id: "demo-booking-03-changes-requested",
            vendorId: vendorId,
            productId: distBoardProd.id,
            units: 4,
            startDate: new Date(now.getTime() + 3 * 24 * 3600 * 1000), // in 3 days
            endDate: new Date(now.getTime() + 6 * 24 * 3600 * 1000),
            status: "changes_requested",
            paymentStatus: "unpaid",
            fulfillmentStatus: "pending",
            userId: clientUser?.id || null,
            projectId: "PROJ-DEMO-03",
            projectName: "[DEMO] QNCC Global AI & Tech Summit",
            customerName: "Apex Corporate Events (Fahad)",
            customerEmail: "fahad.marri@apexevents.qa",
            customerPhone: "+974 7733 4455",
            totalPrice: 19500,
            discount: 500,
            logisticsCost: 1200,
            laborCost: 2000,
            notes: "Stage 3: Revision requested. Client asked to upgrade power distribution and shift load-in to 05:00 AM.",
            adminNotes: "Amending power spec from 32A to 63A 3-phase and revising logistics schedule.",
            createdAt: new Date(now.getTime() - 24 * 3600 * 1000),
            updatedAt: new Date(now.getTime() - 3 * 3600 * 1000),
        },
        {
            id: "demo-booking-04-approved",
            vendorId: vendorId,
            productId: subProd.id,
            units: 8,
            startDate: new Date(now.getTime() + 1 * 24 * 3600 * 1000), // tomorrow
            endDate: new Date(now.getTime() + 4 * 24 * 3600 * 1000),
            status: "approved",
            paymentStatus: "partial",
            fulfillmentStatus: "in_progress",
            userId: clientUser?.id || null,
            projectId: "PROJ-DEMO-04",
            projectName: "[DEMO] Katara Amphitheatre Symphonic Jazz Concert",
            customerName: "Doha Arts & Culture Foundation (Rashid)",
            customerEmail: "rashid.dosari@katara.qa",
            customerPhone: "+974 3344 5566",
            totalPrice: 56000,
            discount: 2000,
            logisticsCost: 3000,
            laborCost: 6500,
            notes: "Stage 4: Approved & agreement signed. 50% deposit received. Pick lists generated in warehouse.",
            adminNotes: "Staging Bay A allocated for pallet consolidation. Driver handover scheduled for 08:00 tomorrow.",
            createdAt: new Date(now.getTime() - 48 * 3600 * 1000),
            updatedAt: new Date(now.getTime() - 1 * 3600 * 1000),
        },
        {
            id: "demo-booking-05-booked-active",
            vendorId: vendorId,
            productId: motorProd.id,
            units: 12,
            startDate: new Date(now.getTime() - 1 * 24 * 3600 * 1000), // started yesterday
            endDate: new Date(now.getTime() + 2 * 24 * 3600 * 1000),
            status: "booked",
            paymentStatus: "paid",
            fulfillmentStatus: "fulfilled",
            userId: clientUser?.id || null,
            projectId: "PROJ-DEMO-05",
            projectName: "[DEMO] Aspire Dome Esports Championship Finals",
            customerName: "Qatar Sports Federation (Tariq)",
            customerEmail: "tariq.mansoor@aspire.qa",
            customerPhone: "+974 5566 7788",
            totalPrice: 78500,
            discount: 3500,
            logisticsCost: 4500,
            laborCost: 9000,
            notes: "Stage 5: Fully booked & active on-site. Rigging motors deployed and operating in arena roof truss.",
            adminNotes: "100% payment settled via QNB corporate transfer. Return transit booked for Thursday 23:00.",
            createdAt: new Date(now.getTime() - 72 * 3600 * 1000),
            updatedAt: new Date(now.getTime() - 20 * 3600 * 1000),
        },
    ];

    for (const b of demoBookings) {
        try {
            await db.delete(bookings).where(eq(bookings.id, b.id));
        } catch (err) {}
        await db.insert(bookings).values(b as any);
        console.log(`   ✅ Created Demo Booking: ${b.projectName} [STATUS: ${b.status.toUpperCase()}]`);
    }

    console.log("\n🎉 ALL INVENTORY ITEMS AND DEMO BOOKINGS SEEDED SUCCESSFULLY!");
}

seedWarehouseItemsAndBookings().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
