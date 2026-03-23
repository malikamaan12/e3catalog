import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { vendorWarehouses, vendors, inventoryUnits } from "@/lib/db/schema";
import { eq, and, sql } from "drizzle-orm";
import { getSession } from "@/lib/auth";
import { USER_ROLES } from "@/lib/constants";
import { v4 as uuidv4 } from "uuid";

async function getVendorId(session: any) {
    if ([USER_ROLES.ADMIN, USER_ROLES.SUPER_ADMIN].includes(session.role)) {
        return null; // Admin can manage any
    }
    const vendor = await db.query.vendors.findFirst({
        where: eq(vendors.userId, session.id),
    });
    return vendor?.id || null;
}

// GET — List warehouses for the current vendor
export async function GET(req: NextRequest) {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    try {
        const vendorId = await getVendorId(session);
        const { searchParams } = new URL(req.url);
        const filterVendorId = searchParams.get("vendorId") || vendorId;

        if (!filterVendorId) {
            return NextResponse.json({ error: "No vendor context" }, { status: 400 });
        }

        const warehouses = await db.select({
            id: vendorWarehouses.id,
            vendorId: vendorWarehouses.vendorId,
            name: vendorWarehouses.name,
            address: vendorWarehouses.address,
            city: vendorWarehouses.city,
            isDefault: vendorWarehouses.isDefault,
            createdAt: vendorWarehouses.createdAt,
            unitCount: sql<number>`(SELECT COUNT(*) FROM inventory_units WHERE warehouse_id = ${vendorWarehouses.id})`.as("unit_count"),
        })
        .from(vendorWarehouses)
        .where(eq(vendorWarehouses.vendorId, filterVendorId))
        .execute();

        return NextResponse.json(warehouses);
    } catch (error) {
        console.error("Warehouse GET Error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}

// POST — Create a new warehouse
export async function POST(req: NextRequest) {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    try {
        const vendorId = await getVendorId(session);
        if (!vendorId && session.role === USER_ROLES.VENDOR) {
            return NextResponse.json({ error: "Vendor profile not found" }, { status: 400 });
        }

        const body = await req.json();
        const { name, address, city, isDefault, targetVendorId } = body;

        if (!name) return NextResponse.json({ error: "Warehouse name is required" }, { status: 400 });

        const effectiveVendorId = targetVendorId || vendorId;
        if (!effectiveVendorId) return NextResponse.json({ error: "No vendor context" }, { status: 400 });

        // If this is default, unset other defaults
        if (isDefault) {
            await db.update(vendorWarehouses)
                .set({ isDefault: false })
                .where(eq(vendorWarehouses.vendorId, effectiveVendorId))
                .execute();
        }

        const newWarehouse = {
            id: uuidv4(),
            vendorId: effectiveVendorId,
            name,
            address: address || null,
            city: city || null,
            isDefault: isDefault || false,
            createdAt: new Date(),
            updatedAt: new Date(),
        };

        await db.insert(vendorWarehouses).values(newWarehouse).execute();

        return NextResponse.json(newWarehouse, { status: 201 });
    } catch (error) {
        console.error("Warehouse POST Error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
