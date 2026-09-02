import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { warehousePickLists, warehousePickItems, bookings, products, inventoryUnits, vendorWarehouses, users } from "@/lib/db/schema";
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
        const bookingId = url.searchParams.get("bookingId");
        const status = url.searchParams.get("status");

        const pickLists = await db.query.warehousePickLists.findMany({
            where: bookingId 
                ? eq(warehousePickLists.bookingId, bookingId) 
                : (status ? eq(warehousePickLists.status, status) : undefined),
            orderBy: [desc(warehousePickLists.createdAt)],
            with: {
                booking: {
                    columns: { id: true, customerName: true, customerEmail: true, startDate: true, endDate: true, status: true, projectName: true }
                },
                warehouse: true,
                assignedPicker: { columns: { id: true, name: true, email: true } },
                items: {
                    with: {
                        product: { columns: { id: true, name: true, itemCode: true, thumbnailUrl: true } },
                        inventoryUnit: { columns: { id: true, assetTagCode: true, conditionStatus: true, shelfLocation: true } }
                    }
                }
            }
        });

        return NextResponse.json({ pickLists });
    } catch (e: any) {
        console.error("GET /api/dashboard/warehouse/pick-lists error:", e);
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
        const { bookingId, warehouseId, stagingBay, notes } = body;

        if (!bookingId) {
            return NextResponse.json({ error: "bookingId is required." }, { status: 400 });
        }

        const booking = await db.query.bookings.findFirst({
            where: eq(bookings.id, bookingId),
            with: { product: true }
        });

        if (!booking) return NextResponse.json({ error: "Booking not found." }, { status: 404 });

        const pickListId = uuid();
        const pickNumber = `PCK-${Date.now().toString(36).toUpperCase()}`;

        // 1. Create Pick List Header
        const [newList] = await db.insert(warehousePickLists).values({
            id: pickListId,
            pickNumber,
            bookingId,
            warehouseId: warehouseId || null,
            stagingBay: stagingBay || "Bay 01 - Dispatch Dock",
            status: "picking",
            assignedPickerId: user.id,
            notes: notes || null,
        }).returning();

        // 2. Create Pick Items for the booked product
        await db.insert(warehousePickItems).values({
            id: uuid(),
            pickListId,
            productId: booking.productId,
            requiredQty: booking.units,
            pickedQty: 0,
            isAccessory: false,
            isVerified: false,
        });

        // 3. Add standard required accessory checklist items
        const standardAccessories = [
            "Power Cables & Extension Drops",
            "Flight Case / Protective Bag",
            "Mounting Clamps & Safety Wire (TUV Certified)",
        ];

        for (const acc of standardAccessories) {
            await db.insert(warehousePickItems).values({
                id: uuid(),
                pickListId,
                productId: booking.productId,
                requiredQty: booking.units,
                pickedQty: 0,
                isAccessory: true,
                accessoryName: acc,
                isVerified: false,
            });
        }

        return NextResponse.json({ pickList: newList }, { status: 201 });
    } catch (e: any) {
        console.error("POST /api/dashboard/warehouse/pick-lists error:", e);
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
