import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { productKitItems, products } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { requireAdmin } from "@/lib/requireAdmin";
import { USER_ROLES } from "@/lib/constants";
import { v4 as uuid } from "uuid";

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id: parentProductId } = await params;

    try {
        const items = await db.query.productKitItems.findMany({
            where: eq(productKitItems.parentProductId, parentProductId),
            with: {
                childProduct: true,
            }
        });

        return NextResponse.json({ kitItems: items });
    } catch (e: any) {
        console.error("GET kit-items error:", e);
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}

export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const { error } = await requireAdmin([
        USER_ROLES.ADMIN,
        USER_ROLES.SUPER_ADMIN,
        USER_ROLES.VENDOR,
        USER_ROLES.WAREHOUSE_MANAGER,
    ]);
    if (error) return error;

    const { id: parentProductId } = await params;

    try {
        const body = await request.json();
        const { childProductId, quantity = 1, isOptional = false } = body;

        if (!childProductId) {
            return NextResponse.json({ error: "childProductId is required." }, { status: 400 });
        }

        if (childProductId === parentProductId) {
            return NextResponse.json({ error: "A product cannot contain itself as a kit component." }, { status: 400 });
        }

        // Verify child product exists
        const child = await db.query.products.findFirst({
            where: eq(products.id, childProductId),
        });
        if (!child) {
            return NextResponse.json({ error: "Child product not found." }, { status: 404 });
        }

        // Check if already in kit
        const existing = await db.query.productKitItems.findFirst({
            where: and(
                eq(productKitItems.parentProductId, parentProductId),
                eq(productKitItems.childProductId, childProductId)
            )
        });

        let result;
        if (existing) {
            [result] = await db.update(productKitItems)
                .set({ quantity: (existing.quantity || 1) + (parseInt(quantity, 10) || 1) })
                .where(eq(productKitItems.id, existing.id))
                .returning();
        } else {
            const newItemId = uuid();
            [result] = await db.insert(productKitItems).values({
                id: newItemId,
                parentProductId,
                childProductId,
                quantity: Math.max(1, parseInt(quantity, 10) || 1),
                isOptional: Boolean(isOptional),
            }).returning();
        }

        // Flag parent product as isKit
        await db.update(products)
            .set({ isKit: true, updatedAt: new Date() })
            .where(eq(products.id, parentProductId));

        return NextResponse.json({ success: true, item: result }, { status: 201 });
    } catch (e: any) {
        console.error("POST kit-items error:", e);
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}

export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const { error } = await requireAdmin([
        USER_ROLES.ADMIN,
        USER_ROLES.SUPER_ADMIN,
        USER_ROLES.VENDOR,
        USER_ROLES.WAREHOUSE_MANAGER,
    ]);
    if (error) return error;

    const { id: parentProductId } = await params;
    const url = new URL(request.url);
    const itemId = url.searchParams.get("itemId");

    if (!itemId) {
        return NextResponse.json({ error: "itemId is required." }, { status: 400 });
    }

    try {
        await db.delete(productKitItems).where(
            and(
                eq(productKitItems.id, itemId),
                eq(productKitItems.parentProductId, parentProductId)
            )
        );

        // Check remaining items
        const remaining = await db.query.productKitItems.findMany({
            where: eq(productKitItems.parentProductId, parentProductId),
        });

        if (remaining.length === 0) {
            await db.update(products)
                .set({ isKit: false, updatedAt: new Date() })
                .where(eq(products.id, parentProductId));
        }

        return NextResponse.json({ success: true, remainingCount: remaining.length });
    } catch (e: any) {
        console.error("DELETE kit-items error:", e);
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
