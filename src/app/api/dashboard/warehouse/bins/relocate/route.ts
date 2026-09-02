import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { inventoryUnits, warehouseBins, warehouseZones, inspectionLogs } from "@/lib/db/schema";
import { eq, inArray } from "drizzle-orm";
import { requireAuth } from "@/lib/auth";
import { USER_ROLES } from "@/lib/constants";
import { v4 as uuid } from "uuid";

export async function POST(req: NextRequest) {
    try {
        const { user, error } = await requireAuth();
        if (error || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const isAuthorized = [USER_ROLES.SUPER_ADMIN, USER_ROLES.ADMIN, USER_ROLES.WAREHOUSE_MANAGER, USER_ROLES.VENDOR].includes(user.role as any);
        if (!isAuthorized) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

        const body = await req.json();
        const { unitIds, targetBinCode, targetBinId, notes } = body;

        if ((!unitIds || !Array.isArray(unitIds) || unitIds.length === 0) || (!targetBinCode && !targetBinId)) {
            return NextResponse.json({ error: "unitIds array and targetBinCode or targetBinId are required." }, { status: 400 });
        }

        // 1. Resolve Target Bin
        let targetBin = null;
        if (targetBinId) {
            targetBin = await db.query.warehouseBins.findFirst({
                where: eq(warehouseBins.id, targetBinId),
                with: { zone: true }
            });
        } else if (targetBinCode) {
            targetBin = await db.query.warehouseBins.findFirst({
                where: eq(warehouseBins.binCode, targetBinCode.trim().toUpperCase()),
                with: { zone: true }
            });
        }

        if (!targetBin) {
            return NextResponse.json({ error: `Target bin "${targetBinCode || targetBinId}" not found.` }, { status: 404 });
        }

        // 2. Fetch units to relocate
        const units = await db.query.inventoryUnits.findMany({
            where: inArray(inventoryUnits.id, unitIds)
        });

        if (units.length === 0) {
            return NextResponse.json({ error: "No matching inventory units found." }, { status: 404 });
        }

        // 3. Atomically update unit locations
        await db.update(inventoryUnits)
            .set({
                warehouseId: targetBin.warehouseId,
                zoneId: targetBin.zoneId,
                binId: targetBin.id,
                shelfLocation: `${targetBin.aisle || ''} / ${targetBin.rack || ''} / ${targetBin.shelf || ''}`.trim(),
                updatedAt: new Date(),
            })
            .where(inArray(inventoryUnits.id, unitIds));

        // 4. Record audit inspection logs
        for (const u of units) {
            await db.insert(inspectionLogs).values({
                id: uuid(),
                unitId: u.id,
                inspectorId: user.id,
                inspectionType: "routine",
                conditionBefore: u.conditionStatus,
                conditionAfter: u.conditionStatus,
                notes: `Relocated to Bin: ${targetBin.binCode} (${targetBin.zone?.name || 'Zone'}). ${notes || ''}`.trim(),
            });
        }

        return NextResponse.json({
            success: true,
            relocatedCount: units.length,
            targetBin: {
                id: targetBin.id,
                binCode: targetBin.binCode,
                zoneName: targetBin.zone?.name,
                warehouseId: targetBin.warehouseId
            }
        });
    } catch (e: any) {
        console.error("POST /api/dashboard/warehouse/bins/relocate error:", e);
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
