import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { spareParts, vendorWarehouses } from "@/lib/db/schema";
import { eq, desc, lte } from "drizzle-orm";
import { requireAdmin } from "@/lib/requireAdmin";
import { USER_ROLES } from "@/lib/constants";
import { v4 as uuid } from "uuid";

export async function GET(req: NextRequest) {
    const { user, error } = await requireAdmin([
        USER_ROLES.ADMIN,
        USER_ROLES.SUPER_ADMIN,
        USER_ROLES.WAREHOUSE_MANAGER,
        USER_ROLES.VENDOR,
    ]);
    if (error) return error;

    try {
        const url = new URL(req.url);
        const category = url.searchParams.get("category");

        const parts = await db.query.spareParts.findMany({
            where: category ? eq(spareParts.category, category) : undefined,
            orderBy: [desc(spareParts.createdAt)],
            with: {
                warehouse: true,
            }
        });

        const enriched = parts.map(p => ({
            ...p,
            isLowStock: p.stockQuantity <= p.minStockThreshold,
        }));

        return NextResponse.json({ parts: enriched });
    } catch (e: any) {
        console.error("GET /api/admin/fleet/spare-parts error:", e);
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    const { user, error } = await requireAdmin([
        USER_ROLES.ADMIN,
        USER_ROLES.SUPER_ADMIN,
        USER_ROLES.WAREHOUSE_MANAGER,
    ]);
    if (error) return error;

    try {
        const body = await req.json();
        const {
            partNumber,
            name,
            category = "cables",
            stockQuantity = 0,
            minStockThreshold = 5,
            unitCost = 0,
            warehouseId,
            description,
        } = body;

        if (!partNumber || !name) {
            return NextResponse.json({ error: "partNumber and name are required." }, { status: 400 });
        }

        const [created] = await db.insert(spareParts).values({
            id: uuid(),
            partNumber: partNumber.toUpperCase().trim(),
            name,
            category,
            stockQuantity: parseInt(stockQuantity, 10),
            minStockThreshold: parseInt(minStockThreshold, 10),
            unitCost: parseFloat(unitCost),
            warehouseId: warehouseId || null,
            description: description || null,
        }).returning();

        return NextResponse.json({ part: created }, { status: 201 });
    } catch (e: any) {
        console.error("POST /api/admin/fleet/spare-parts error:", e);
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
