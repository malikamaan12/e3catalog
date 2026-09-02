import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { warehouseBins, warehouseZones, inventoryUnits, vendorWarehouses } from "@/lib/db/schema";
import { eq, sql, desc, and, or, like } from "drizzle-orm";
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
        const zoneId = url.searchParams.get("zoneId");
        const search = url.searchParams.get("search");

        let query = db.select({
            id: warehouseBins.id,
            warehouseId: warehouseBins.warehouseId,
            warehouseName: vendorWarehouses.name,
            zoneId: warehouseBins.zoneId,
            zoneName: warehouseZones.name,
            zoneCode: warehouseZones.code,
            zoneType: warehouseZones.zoneType,
            binCode: warehouseBins.binCode,
            aisle: warehouseBins.aisle,
            rack: warehouseBins.rack,
            shelf: warehouseBins.shelf,
            bin: warehouseBins.bin,
            maxCapacity: warehouseBins.maxCapacity,
            isActive: warehouseBins.isActive,
            currentUnitCount: sql<number>`count(distinct ${inventoryUnits.id})`,
            createdAt: warehouseBins.createdAt,
        })
        .from(warehouseBins)
        .leftJoin(vendorWarehouses, eq(warehouseBins.warehouseId, vendorWarehouses.id))
        .leftJoin(warehouseZones, eq(warehouseBins.zoneId, warehouseZones.id))
        .leftJoin(inventoryUnits, eq(warehouseBins.id, inventoryUnits.binId))
        .groupBy(warehouseBins.id, vendorWarehouses.name, warehouseZones.name, warehouseZones.code, warehouseZones.zoneType)
        .orderBy(warehouseBins.binCode);

        const conditions = [];
        if (warehouseId) conditions.push(eq(warehouseBins.warehouseId, warehouseId));
        if (zoneId) conditions.push(eq(warehouseBins.zoneId, zoneId));
        if (search) {
            conditions.push(or(
                like(warehouseBins.binCode, `%${search}%`),
                like(warehouseBins.aisle, `%${search}%`),
                like(warehouseBins.rack, `%${search}%`)
            ));
        }

        if (conditions.length > 0) {
            query = query.where(and(...conditions)) as any;
        }

        const bins = await query;
        return NextResponse.json({ bins });
    } catch (e: any) {
        console.error("GET /api/dashboard/warehouse/bins error:", e);
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
        const { warehouseId, zoneId, binCode, aisle, rack, shelf, bin, maxCapacity } = body;

        if (!warehouseId || !zoneId || !binCode) {
            return NextResponse.json({ error: "warehouseId, zoneId, and binCode are required." }, { status: 400 });
        }

        const newBin = await db.insert(warehouseBins).values({
            id: uuid(),
            warehouseId,
            zoneId,
            binCode: binCode.toUpperCase().trim(),
            aisle: aisle || null,
            rack: rack || null,
            shelf: shelf || null,
            bin: bin || null,
            maxCapacity: maxCapacity ? parseInt(maxCapacity, 10) : 50,
            isActive: true,
        }).returning();

        return NextResponse.json({ bin: newBin[0] }, { status: 201 });
    } catch (e: any) {
        console.error("POST /api/dashboard/warehouse/bins error:", e);
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
