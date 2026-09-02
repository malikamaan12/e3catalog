import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { warehouseZones, warehouseBins, inventoryUnits, vendorWarehouses } from "@/lib/db/schema";
import { eq, sql, desc, and } from "drizzle-orm";
import { requireAuth } from "@/lib/auth";
import { USER_ROLES } from "@/lib/constants";
import { v4 as uuid } from "uuid";

export async function GET(req: NextRequest) {
    try {
        const { user, error } = await requireAuth();
        if (error || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const url = new URL(req.url);
        const warehouseId = url.searchParams.get("warehouseId");

        // Allowed: super_admin, admin, warehouse_manager, vendor
        const isAuthorized = [USER_ROLES.SUPER_ADMIN, USER_ROLES.ADMIN, USER_ROLES.WAREHOUSE_MANAGER, USER_ROLES.VENDOR].includes(user.role as any);
        if (!isAuthorized) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

        let query = db.select({
            id: warehouseZones.id,
            warehouseId: warehouseZones.warehouseId,
            warehouseName: vendorWarehouses.name,
            name: warehouseZones.name,
            code: warehouseZones.code,
            zoneType: warehouseZones.zoneType,
            color: warehouseZones.color,
            description: warehouseZones.description,
            binCount: sql<number>`count(distinct ${warehouseBins.id})`,
            unitCount: sql<number>`count(distinct ${inventoryUnits.id})`,
            createdAt: warehouseZones.createdAt,
        })
        .from(warehouseZones)
        .leftJoin(vendorWarehouses, eq(warehouseZones.warehouseId, vendorWarehouses.id))
        .leftJoin(warehouseBins, eq(warehouseZones.id, warehouseBins.zoneId))
        .leftJoin(inventoryUnits, eq(warehouseZones.id, inventoryUnits.zoneId))
        .groupBy(warehouseZones.id, vendorWarehouses.name)
        .orderBy(warehouseZones.code);

        if (warehouseId) {
            query = query.where(eq(warehouseZones.warehouseId, warehouseId)) as any;
        }

        const zones = await query;
        return NextResponse.json({ zones });
    } catch (e: any) {
        console.error("GET /api/dashboard/warehouse/zones error:", e);
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
        const { warehouseId, name, code, zoneType, color, description } = body;

        if (!warehouseId || !name || !code) {
            return NextResponse.json({ error: "warehouseId, name, and code are required." }, { status: 400 });
        }

        const newZone = await db.insert(warehouseZones).values({
            id: uuid(),
            warehouseId,
            name,
            code: code.toUpperCase().trim(),
            zoneType: zoneType || "storage",
            color: color || "#3b82f6",
            description: description || null,
        }).returning();

        return NextResponse.json({ zone: newZone[0] }, { status: 201 });
    } catch (e: any) {
        console.error("POST /api/dashboard/warehouse/zones error:", e);
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
