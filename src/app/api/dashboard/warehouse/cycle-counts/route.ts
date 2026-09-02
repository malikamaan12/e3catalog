import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { inventoryCycleCounts, cycleCountItems, inventoryUnits, warehouseZones, vendorWarehouses, users } from "@/lib/db/schema";
import { eq, desc, and } from "drizzle-orm";
import { requireAuth } from "@/lib/auth";
import { USER_ROLES } from "@/lib/constants";
import { v4 as uuid } from "uuid";

export async function GET(req: NextRequest) {
    try {
        const { user, error } = await requireAuth();
        if (error || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const isAuthorized = [USER_ROLES.SUPER_ADMIN, USER_ROLES.ADMIN, USER_ROLES.WAREHOUSE_MANAGER, USER_ROLES.VENDOR].includes(user.role as any);
        if (!isAuthorized) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

        const url = new URL(req.url);
        const warehouseId = url.searchParams.get("warehouseId");

        const counts = await db.query.inventoryCycleCounts.findMany({
            where: warehouseId ? eq(inventoryCycleCounts.warehouseId, warehouseId) : undefined,
            orderBy: [desc(inventoryCycleCounts.createdAt)],
            with: {
                warehouse: true,
                zone: true,
                countedBy: { columns: { id: true, name: true, email: true } },
                items: {
                    with: {
                        inventoryUnit: true,
                        expectedBin: true,
                        scannedBin: true,
                    }
                }
            }
        });

        return NextResponse.json({ counts });
    } catch (e: any) {
        console.error("GET /api/dashboard/warehouse/cycle-counts error:", e);
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    try {
        const { user, error } = await requireAuth();
        if (error || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const isAuthorized = [USER_ROLES.SUPER_ADMIN, USER_ROLES.ADMIN, USER_ROLES.WAREHOUSE_MANAGER].includes(user.role as any);
        if (!isAuthorized) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

        const body = await req.json();
        const { warehouseId, zoneId, title, notes } = body;

        if (!warehouseId || !title) {
            return NextResponse.json({ error: "warehouseId and title are required." }, { status: 400 });
        }

        // Fetch expected units in this warehouse/zone
        let unitsQuery = db.select().from(inventoryUnits).where(eq(inventoryUnits.warehouseId, warehouseId));
        if (zoneId) {
            unitsQuery = db.select().from(inventoryUnits).where(and(
                eq(inventoryUnits.warehouseId, warehouseId),
                eq(inventoryUnits.zoneId, zoneId)
            )) as any;
        }

        const expectedUnits = await unitsQuery;
        const countId = uuid();
        const countNumber = `CNT-${Date.now().toString(36).toUpperCase()}`;

        const [newCount] = await db.insert(inventoryCycleCounts).values({
            id: countId,
            countNumber,
            warehouseId,
            zoneId: zoneId || null,
            title,
            status: "in_progress",
            countedById: user.id,
            totalExpectedUnits: expectedUnits.length,
            totalScannedUnits: 0,
            discrepancyCount: 0,
            startedAt: new Date(),
            notes: notes || null,
        }).returning();

        // Populate initial expected items
        for (const u of expectedUnits) {
            await db.insert(cycleCountItems).values({
                id: uuid(),
                cycleCountId: countId,
                inventoryUnitId: u.id,
                productId: u.productId,
                expectedBinId: u.binId || null,
                expectedStatus: u.availabilityStatus,
                discrepancyType: "missing", // Starts as missing until scanned
                isResolved: false,
            });
        }

        return NextResponse.json({ cycleCount: newCount }, { status: 201 });
    } catch (e: any) {
        console.error("POST /api/dashboard/warehouse/cycle-counts error:", e);
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
