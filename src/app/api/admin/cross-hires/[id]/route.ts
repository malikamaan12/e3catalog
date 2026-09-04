import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { crossHireOrders } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { requireAdmin } from "@/lib/requireAdmin";
import { USER_ROLES } from "@/lib/constants";

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const { error } = await requireAdmin([
        USER_ROLES.ADMIN,
        USER_ROLES.SUPER_ADMIN,
        USER_ROLES.WAREHOUSE_MANAGER,
        USER_ROLES.SALES_REP,
    ]);
    if (error) return error;

    const { id } = await params;

    try {
        const order = await db.query.crossHireOrders.findFirst({
            where: eq(crossHireOrders.id, id),
            with: {
                product: true,
                supplierVendor: true,
                booking: true,
                creator: true,
            }
        });

        if (!order) {
            return NextResponse.json({ error: "Cross-hire order not found." }, { status: 404 });
        }

        return NextResponse.json({ order });
    } catch (e: any) {
        console.error("GET /api/admin/cross-hires/[id] error:", e);
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}

export async function PATCH(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const { error } = await requireAdmin([
        USER_ROLES.ADMIN,
        USER_ROLES.SUPER_ADMIN,
        USER_ROLES.WAREHOUSE_MANAGER,
    ]);
    if (error) return error;

    const { id } = await params;

    try {
        const body = await request.json();
        const { status, assetTagAllocations, notes } = body;

        const updateData: Partial<typeof crossHireOrders.$inferInsert> = {
            updatedAt: new Date(),
        };

        if (status) updateData.status = status;
        if (assetTagAllocations !== undefined) updateData.assetTagAllocations = assetTagAllocations;
        if (notes !== undefined) updateData.notes = notes;

        const [updated] = await db.update(crossHireOrders)
            .set(updateData)
            .where(eq(crossHireOrders.id, id))
            .returning();

        return NextResponse.json({
            success: true,
            order: updated,
            message: `Cross-Hire Order #${updated.orderNumber} transitioned to '${updated.status}'.`
        });
    } catch (e: any) {
        console.error("PATCH /api/admin/cross-hires/[id] error:", e);
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
