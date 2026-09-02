import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { warehousePickLists, warehousePickItems, bookingUnitAssignments, inventoryUnits, bookings } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
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

        const pickList = await db.query.warehousePickLists.findFirst({
            where: eq(warehousePickLists.id, id),
            with: {
                booking: {
                    with: { product: true }
                },
                warehouse: true,
                assignedPicker: { columns: { id: true, name: true, email: true } },
                items: {
                    with: {
                        product: true,
                        inventoryUnit: true,
                    }
                }
            }
        });

        if (!pickList) return NextResponse.json({ error: "Pick list not found" }, { status: 404 });
        return NextResponse.json({ pickList });
    } catch (e: any) {
        console.error("GET /api/dashboard/warehouse/pick-lists/[id] error:", e);
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
        const { status, stagingBay, itemUpdates, notes } = body;

        const pickList = await db.query.warehousePickLists.findFirst({
            where: eq(warehousePickLists.id, id),
            with: { items: true, booking: true }
        });

        if (!pickList) return NextResponse.json({ error: "Pick list not found" }, { status: 404 });

        // Update items if provided (e.g. verified checkboxes, unit assignments)
        if (itemUpdates && Array.isArray(itemUpdates)) {
            for (const update of itemUpdates) {
                if (update.id) {
                    await db.update(warehousePickItems)
                        .set({
                            isVerified: update.isVerified ?? undefined,
                            pickedQty: update.pickedQty ?? undefined,
                            inventoryUnitId: update.inventoryUnitId ?? undefined,
                        })
                        .where(eq(warehousePickItems.id, update.id));

                    // If a serialized unit is assigned to a non-accessory item, create booking assignment
                    if (update.inventoryUnitId && !update.isAccessory) {
                        const existingAssoc = await db.query.bookingUnitAssignments.findFirst({
                            where: and(
                                eq(bookingUnitAssignments.bookingId, pickList.bookingId),
                                eq(bookingUnitAssignments.inventoryUnitId, update.inventoryUnitId)
                            )
                        });

                        if (!existingAssoc) {
                            await db.insert(bookingUnitAssignments).values({
                                id: uuid(),
                                bookingId: pickList.bookingId,
                                inventoryUnitId: update.inventoryUnitId,
                                status: "reserved",
                            });
                        }
                    }
                }
            }
        }

        const updateData: any = { updatedAt: new Date() };
        if (stagingBay) updateData.stagingBay = stagingBay;
        if (notes) updateData.notes = notes;
        if (status) {
            updateData.status = status;
            if (status === "packed") updateData.packedAt = new Date();
            if (status === "staged") updateData.stagedAt = new Date();
        }

        const updated = await db.update(warehousePickLists)
            .set(updateData)
            .where(eq(warehousePickLists.id, id))
            .returning();

        return NextResponse.json({ pickList: updated[0] });
    } catch (e: any) {
        console.error("PATCH /api/dashboard/warehouse/pick-lists/[id] error:", e);
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
