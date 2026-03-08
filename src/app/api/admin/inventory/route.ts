import { db } from "@/lib/db";
import { inventoryOverrides, products } from "@/lib/db/schema";
import { desc, eq, and, inArray } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { v4 as uuidv4 } from "uuid";
import { requireAdmin } from "@/lib/requireAdmin";

export async function GET() {
    try {
        const { user, error } = await requireAdmin(["admin", "super_admin", "sales_rep", "warehouse_manager", "vendor"]);
        if (error) return error;

        const isSuperAdmin = user.role === 'super_admin' || user.role === 'admin';
        const targetVendorId = isSuperAdmin ? null : (user as any).vendorId;

        if (!isSuperAdmin && !targetVendorId) {
            return NextResponse.json({ error: "No vendor context assigned." }, { status: 403 });
        }

        let productIds: string[] | null = null;
        if (!isSuperAdmin) {
            const vendorProducts = await db.query.products.findMany({
                where: eq(products.vendorId, targetVendorId),
                columns: { id: true }
            });
            productIds = vendorProducts.map(p => p.id);
            if (productIds.length === 0) {
                return NextResponse.json([]); // No products, no overrides
            }
        }

        const overrides = await db.query.inventoryOverrides.findMany({
            where: productIds ? inArray(inventoryOverrides.productId, productIds) : undefined,
            orderBy: [desc(inventoryOverrides.createdAt)],
            with: {
                product: { columns: { name: true } },
            },
        });
        return NextResponse.json(overrides);
    } catch (e: unknown) {
        return NextResponse.json({ error: (e as Error).message }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    try {
        const { user, error } = await requireAdmin(["admin", "super_admin", "warehouse_manager", "vendor"]);
        if (error) return error;

        const isSuperAdmin = user.role === 'super_admin' || user.role === 'admin';
        const targetVendorId = isSuperAdmin ? null : (user as any).vendorId;

        if (!isSuperAdmin && !targetVendorId) {
            return NextResponse.json({ error: "No vendor context assigned." }, { status: 403 });
        }

        const body = await req.json();

        // Basic validation
        if (!body.productId || !body.startDate || !body.endDate || !body.unitsOffline || !body.reason) {
            return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
        }

        // Verify product ownership
        if (!isSuperAdmin) {
            const prod = await db.query.products.findFirst({
                where: and(eq(products.id, body.productId), eq(products.vendorId, targetVendorId))
            });
            if (!prod) {
                return NextResponse.json({ error: "Forbidden: Product does not belong to you." }, { status: 403 });
            }
        }

        const newOverride = {
            id: uuidv4(),
            productId: body.productId,
            startDate: body.startDate,
            endDate: body.endDate,
            unitsOffline: Number(body.unitsOffline),
            reason: body.reason,
            createdAt: new Date(),
        };

        await db.insert(inventoryOverrides).values(newOverride);

        // Fetch the created override with product relations to return
        const created = await db.query.inventoryOverrides.findFirst({
            where: eq(inventoryOverrides.id, newOverride.id),
            with: { product: true }
        });

        return NextResponse.json(created, { status: 201 });
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}

export async function DELETE(req: NextRequest) {
    try {
        const { user, error } = await requireAdmin(["admin", "super_admin", "warehouse_manager", "vendor"]);
        if (error) return error;

        const isSuperAdmin = user.role === 'super_admin' || user.role === 'admin';
        const targetVendorId = isSuperAdmin ? null : (user as any).vendorId;

        const { searchParams } = new URL(req.url);
        const id = searchParams.get("id");

        if (!id) {
            return NextResponse.json({ error: "Override ID is required" }, { status: 400 });
        }

        // Verification
        if (!isSuperAdmin) {
            const override = await db.query.inventoryOverrides.findFirst({
                where: eq(inventoryOverrides.id, id),
                with: { product: true }
            });
            if (!override) return NextResponse.json({ error: "Not found" }, { status: 404 });
            if (override.product.vendorId !== targetVendorId) {
                return NextResponse.json({ error: "Forbidden: Not your override." }, { status: 403 });
            }
        }

        await db.delete(inventoryOverrides).where(eq(inventoryOverrides.id, id));
        return NextResponse.json({ success: true });
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
