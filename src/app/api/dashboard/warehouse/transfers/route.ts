import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { warehouseTransfers, warehouseTransferItems, vendorWarehouses, users, inventoryUnits, products } from "@/lib/db/schema";
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
        const status = url.searchParams.get("status");

        const transfers = await db.query.warehouseTransfers.findMany({
            where: status ? eq(warehouseTransfers.status, status) : undefined,
            orderBy: [desc(warehouseTransfers.createdAt)],
            with: {
                sourceWarehouse: true,
                destWarehouse: true,
                requester: {
                    columns: { id: true, name: true, email: true }
                },
                items: {
                    with: {
                        product: {
                            columns: { id: true, name: true, itemCode: true, thumbnailUrl: true }
                        },
                        inventoryUnit: {
                            columns: { id: true, assetTagCode: true, conditionStatus: true }
                        }
                    }
                }
            }
        });

        return NextResponse.json({ transfers });
    } catch (e: any) {
        console.error("GET /api/dashboard/warehouse/transfers error:", e);
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
        const { sourceWarehouseId, destWarehouseId, driverName, vehiclePlate, driverPhone, notes, items } = body;

        if (!sourceWarehouseId || !destWarehouseId || !items || !Array.isArray(items) || items.length === 0) {
            return NextResponse.json({ error: "sourceWarehouseId, destWarehouseId, and items array are required." }, { status: 400 });
        }

        if (sourceWarehouseId === destWarehouseId) {
            return NextResponse.json({ error: "Source and destination warehouse cannot be the same." }, { status: 400 });
        }

        const transferId = uuid();
        const transferNumber = `TRF-${Date.now().toString(36).toUpperCase()}`;

        // 1. Insert Transfer header
        const newTransfer = await db.insert(warehouseTransfers).values({
            id: transferId,
            transferNumber,
            sourceWarehouseId,
            destWarehouseId,
            status: "requested",
            requestedBy: user.id,
            driverName: driverName || null,
            vehiclePlate: vehiclePlate || null,
            driverPhone: driverPhone || null,
            notes: notes || null,
        }).returning();

        // 2. Insert Transfer Items
        for (const itm of items) {
            await db.insert(warehouseTransferItems).values({
                id: uuid(),
                transferId,
                productId: itm.productId,
                inventoryUnitId: itm.inventoryUnitId || null,
                requestedQuantity: itm.requestedQuantity || 1,
                transferredQuantity: itm.transferredQuantity || itm.requestedQuantity || 1,
                status: "pending",
            });
        }

        return NextResponse.json({ transfer: newTransfer[0] }, { status: 201 });
    } catch (e: any) {
        console.error("POST /api/dashboard/warehouse/transfers error:", e);
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
