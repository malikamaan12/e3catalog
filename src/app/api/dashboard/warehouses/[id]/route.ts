import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { vendorWarehouses, vendors, inventoryUnits, users } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { getSession } from "@/lib/auth";
import { USER_ROLES } from "@/lib/constants";

async function getVendorId(session: any) {
    if ([USER_ROLES.ADMIN, USER_ROLES.SUPER_ADMIN].includes(session.role)) {
        return null; // Admin can manage any
    }

    // 1. Check if the user is the PRIMARY vendor owner
    const vendor = await db.query.vendors.findFirst({
        where: eq(vendors.userId, session.id),
    });
    if (vendor) return vendor.id;

    // 2. Check if the user is a sub-employee of a vendor (staff/manager)
    const userRecord = await db.query.users.findFirst({
        where: eq(users.id, session.id),
        columns: { vendorId: true }
    });
    
    return userRecord?.vendorId || null;
}

// PUT — Update a warehouse
export async function PUT(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params;
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    try {
        const warehouse = await db.query.vendorWarehouses.findFirst({
            where: eq(vendorWarehouses.id, id),
        });
        if (!warehouse) return NextResponse.json({ error: "Warehouse not found" }, { status: 404 });

        // Verify ownership
        const currentVendorId = await getVendorId(session);
        if (session.role === USER_ROLES.VENDOR && warehouse.vendorId !== currentVendorId) {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        const body = await req.json();
        const { name, address, city, isDefault } = body;

        // If setting as default, unset others
        if (isDefault) {
            await db.update(vendorWarehouses)
                .set({ isDefault: false })
                .where(eq(vendorWarehouses.vendorId, warehouse.vendorId))
                .execute();
        }

        await db.update(vendorWarehouses)
            .set({
                name: name ?? warehouse.name,
                address: address ?? warehouse.address,
                city: city ?? warehouse.city,
                isDefault: isDefault ?? warehouse.isDefault,
                updatedAt: new Date(),
            })
            .where(eq(vendorWarehouses.id, id))
            .execute();

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Warehouse PUT Error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}

// DELETE — Remove a warehouse (only if no units reference it)
export async function DELETE(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params;
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    try {
        const warehouse = await db.query.vendorWarehouses.findFirst({
            where: eq(vendorWarehouses.id, id),
        });
        if (!warehouse) return NextResponse.json({ error: "Warehouse not found" }, { status: 404 });
        
        // Verify ownership
        const currentVendorId = await getVendorId(session);
        if (session.role === USER_ROLES.VENDOR && warehouse.vendorId !== currentVendorId) {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        // Check for linked units
        const linkedUnits = await db.query.inventoryUnits.findFirst({
            where: eq(inventoryUnits.warehouseId, id),
        });
        if (linkedUnits) {
            return NextResponse.json({ error: "Cannot delete a warehouse with assigned units. Reassign them first." }, { status: 400 });
        }

        await db.delete(vendorWarehouses).where(eq(vendorWarehouses.id, id)).execute();

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Warehouse DELETE Error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
