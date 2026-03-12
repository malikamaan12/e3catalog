import { db, pool } from "@/lib/db";
import { inventoryOverrides, products, inventoryUnits } from "@/lib/db/schema";
import { desc, eq, and, inArray, lte, gte } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { v4 as uuidv4 } from "uuid";
import { requireAdmin } from "@/lib/requireAdmin";
import { parseISO, isValid } from "date-fns";

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

        // Deeply defensive map for return
        const safeOverrides = overrides.map(o => ({
            ...o,
            startDate: o.startDate instanceof Date ? o.startDate.toISOString() : String(o.startDate),
            endDate: o.endDate instanceof Date ? o.endDate.toISOString() : String(o.endDate),
            createdAt: o.createdAt instanceof Date ? o.createdAt.toISOString() : String(o.createdAt),
        }));

        return NextResponse.json(safeOverrides);
    } catch (inventoryGetError: any) {
        console.error("Inventory GET Error:", inventoryGetError);
        return NextResponse.json({ error: inventoryGetError.message || "Internal server error" }, { status: 500 });
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

        // Safe Date Parsing — parseISO returns a proper Date object from a string like "2026-03-15"
        const startDateObj = parseISO(String(body.startDate));
        const endDateObj = parseISO(String(body.endDate));

        if (!isValid(startDateObj) || !isValid(endDateObj)) {
            return NextResponse.json({ error: "Invalid date format provided for inventory override." }, { status: 400 });
        }

        // Pre-format as ISO strings – pass raw strings to pg to bypass Drizzle's
        // timestamp serializer which internally calls `e.toISOString()` and crashes
        // when the date value is not a proper JS Date object.
        const startDateStr = startDateObj.toISOString();
        const endDateStr = endDateObj.toISOString();
        const createdAtStr = new Date().toISOString();

        // Product ownership verification
        if (!isSuperAdmin) {
            const prod = await db.query.products.findFirst({
                where: and(eq(products.id, body.productId), eq(products.vendorId, targetVendorId))
            });
            if (!prod) {
                return NextResponse.json({ error: "Forbidden: Product does not belong to you." }, { status: 403 });
            }
        }

        // ── Stock Capacity Validation ─────────────────────────────────────────────
        // Fetch total physical units for this product
        const physicalUnits = await db.query.inventoryUnits.findMany({
            where: eq(inventoryUnits.productId, body.productId),
            columns: { id: true }
        });
        const totalUnitsInStock = physicalUnits.length;

        if (totalUnitsInStock === 0) {
            return NextResponse.json({ error: "This product has no inventory units configured. Add inventory units first." }, { status: 400 });
        }

        const requestedOffline = Number(body.unitsOffline);

        if (requestedOffline < 1) {
            return NextResponse.json({ error: "Units offline must be at least 1." }, { status: 400 });
        }

        if (requestedOffline > totalUnitsInStock) {
            return NextResponse.json({
                error: `Cannot take ${requestedOffline} unit${requestedOffline > 1 ? "s" : ""} offline. This product only has ${totalUnitsInStock} unit${totalUnitsInStock > 1 ? "s" : ""} in total stock.`
            }, { status: 400 });
        }

        // Check how many units are already locked by overlapping overrides in this date range
        const overlappingOverrides = await db.query.inventoryOverrides.findMany({
            where: and(
                eq(inventoryOverrides.productId, body.productId),
                lte(inventoryOverrides.startDate, endDateObj),
                gte(inventoryOverrides.endDate, startDateObj),
            ),
            columns: { unitsOffline: true }
        });

        const alreadyOffline = overlappingOverrides.reduce((sum, o) => sum + o.unitsOffline, 0);
        const totalAfterNew = alreadyOffline + requestedOffline;

        if (totalAfterNew > totalUnitsInStock) {
            const remaining = Math.max(0, totalUnitsInStock - alreadyOffline);
            return NextResponse.json({
                error: `Cannot lock ${requestedOffline} unit${requestedOffline > 1 ? "s" : ""}. ${alreadyOffline} unit${alreadyOffline > 1 ? "s are" : " is"} already blocked in this date range. Maximum you can lock: ${remaining}.`
            }, { status: 400 });
        }
        // ─────────────────────────────────────────────────────────────────────────

        const newOverrideId = uuidv4();

        // Raw parameterized SQL to bypass Drizzle's ORM type coercion for timestamps.
        // Drizzle internally calls `e.toISOString()` on timestamp column values,
        // which crashes when the pg driver returns dates as strings.
        await pool.query(
            `INSERT INTO inventory_overrides (id, product_id, start_date, end_date, units_offline, reason, created_at)
             VALUES ($1, $2, $3::timestamptz, $4::timestamptz, $5, $6, $7::timestamptz)`,
            [newOverrideId, body.productId, startDateStr, endDateStr, Number(body.unitsOffline), String(body.reason), createdAtStr]
        );

        // Fetch the created record
        const created = await db.query.inventoryOverrides.findFirst({
            where: eq(inventoryOverrides.id, newOverrideId),
            with: { product: { columns: { name: true } } }
        });

        if (!created) throw new Error("Failed to retrieve created override");

        // Return fully safe, manually constructed response
        const safeResponse = {
            id: created.id,
            productId: created.productId,
            startDate: created.startDate instanceof Date ? created.startDate.toISOString() : String(created.startDate),
            endDate: created.endDate instanceof Date ? created.endDate.toISOString() : String(created.endDate),
            unitsOffline: created.unitsOffline,
            reason: created.reason,
            createdAt: created.createdAt instanceof Date ? created.createdAt.toISOString() : String(created.createdAt),
            product: created.product ? { name: created.product.name } : null,
        };

        return NextResponse.json(safeResponse, { status: 201 });

    } catch (inventoryError: any) {
        console.error("Inventory POST Error Deep Trace:", inventoryError);
        if (inventoryError.stack) console.error(inventoryError.stack);
        return NextResponse.json({ error: inventoryError.message || "Internal server error" }, { status: 500 });
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
    } catch (inventoryDeleteError: any) {
        console.error("Inventory DELETE Error:", inventoryDeleteError);
        return NextResponse.json({ error: inventoryDeleteError.message || "Internal server error" }, { status: 500 });
    }
}

