import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { warehouseTransfers, warehouseTransferItems, inventoryUnits, inspectionLogs } from "@/lib/db/schema";
import { eq, inArray } from "drizzle-orm";
import { requireAuth } from "@/lib/auth";
import { USER_ROLES } from "@/lib/constants";
import { v4 as uuid } from "uuid";

export async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { user, error } = await requireAuth();
        if (error || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const { id } = await params;

        const transfer = await db.query.warehouseTransfers.findFirst({
            where: eq(warehouseTransfers.id, id),
            with: {
                sourceWarehouse: true,
                destWarehouse: true,
                requester: { columns: { id: true, name: true, email: true } },
                items: {
                    with: {
                        product: true,
                        inventoryUnit: true,
                    }
                }
            }
        });

        if (!transfer) return NextResponse.json({ error: "Transfer order not found" }, { status: 404 });
        return NextResponse.json({ transfer });
    } catch (e: any) {
        console.error("GET /api/dashboard/warehouse/transfers/[id] error:", e);
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}

export async function PATCH(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { user, error } = await requireAuth();
        if (error || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const isAuthorized = [USER_ROLES.SUPER_ADMIN, USER_ROLES.ADMIN, USER_ROLES.WAREHOUSE_MANAGER].includes(user.role as any);
        if (!isAuthorized) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

        const { id } = await params;
        const body = await req.json();
        const { status, driverName, vehiclePlate, driverPhone, notes } = body;

        const transfer = await db.query.warehouseTransfers.findFirst({
            where: eq(warehouseTransfers.id, id),
            with: { items: true }
        });

        if (!transfer) return NextResponse.json({ error: "Transfer order not found" }, { status: 404 });

        const updateData: any = { updatedAt: new Date() };
        if (driverName) updateData.driverName = driverName;
        if (vehiclePlate) updateData.vehiclePlate = vehiclePlate;
        if (driverPhone) updateData.driverPhone = driverPhone;
        if (notes) updateData.notes = notes;

        if (status) {
            updateData.status = status;
            if (status === "in_transit") {
                updateData.dispatchedAt = new Date();
                updateData.dispatchedBy = user.id;

                // Update unit status to 'in_transit' if serialized
                const unitIds = transfer.items.map(i => i.inventoryUnitId).filter(Boolean) as string[];
                if (unitIds.length > 0) {
                    await db.update(inventoryUnits)
                        .set({ availabilityStatus: "in_transit", updatedAt: new Date() })
                        .where(inArray(inventoryUnits.id, unitIds));
                }
            } else if (status === "received") {
                updateData.receivedAt = new Date();
                updateData.receivedBy = user.id;

                // Update units to destination warehouse and in_warehouse
                const unitIds = transfer.items.map(i => i.inventoryUnitId).filter(Boolean) as string[];
                if (unitIds.length > 0) {
                    await db.update(inventoryUnits)
                        .set({
                            warehouseId: transfer.destWarehouseId,
                            availabilityStatus: "in_warehouse",
                            updatedAt: new Date()
                        })
                        .where(inArray(inventoryUnits.id, unitIds));

                    // Add inspection/receiving log
                    for (const uId of unitIds) {
                        await db.insert(inspectionLogs).values({
                            id: uuid(),
                            unitId: uId,
                            inspectorId: user.id,
                            inspectionType: "routine",
                            conditionBefore: "excellent",
                            conditionAfter: "excellent",
                            notes: `Received via Transfer ${transfer.transferNumber} at destination warehouse.`,
                        });
                    }
                }
            }
        }

        const updated = await db.update(warehouseTransfers)
            .set(updateData)
            .where(eq(warehouseTransfers.id, id))
            .returning();

        return NextResponse.json({ transfer: updated[0] });
    } catch (e: any) {
        console.error("PATCH /api/dashboard/warehouse/transfers/[id] error:", e);
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
