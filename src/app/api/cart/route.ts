import { db } from "@/lib/db";
import { cartItems, products } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { v4 as uuid } from "uuid";
import { getCurrentUser } from "@/lib/auth";

const SESSION_COOKIE = "rental_session";

function getSessionId(req: NextRequest): string {
    return req.cookies.get(SESSION_COOKIE)?.value || uuid();
}

export async function GET(req: NextRequest) {
    const sessionId = getSessionId(req);

    const items = await db.query.cartItems.findMany({
        where: eq(cartItems.sessionId, sessionId),
        with: {
            product: {
                columns: {
                    id: true,
                    name: true,
                    slug: true,
                    pricePerDay: true,
                    pricePerHour: true,
                    showPrice: true,
                    thumbnailUrl: true,
                    dimensions: true,
                    unit: true,
                },
            },
        },
    });

    const response = NextResponse.json(items);
    response.cookies.set(SESSION_COOKIE, sessionId, {
        httpOnly: true,
        sameSite: "lax",
        maxAge: 60 * 60 * 24 * 7, // 7 days
    });
    return response;
}

export async function POST(req: NextRequest) {
    try {
        const sessionId = getSessionId(req);
        const currentUser = await getCurrentUser().catch(() => null);
        const body = await req.json();

        const { productId, quantity, startDate, endDate, startTime, endTime } = body;

        console.log("Cart POST request:", { productId, quantity, startDate, endDate, sessionId });

        if (!productId || !quantity || !startDate || !endDate) {
            return NextResponse.json(
                { error: "Missing required fields" },
                { status: 400 }
            );
        }

        const startD = new Date(startDate);
        const endD = new Date(endDate);

        // Check if same product with same dates already in cart
        const existing = await db.query.cartItems.findFirst({
            where: and(
                eq(cartItems.sessionId, sessionId),
                eq(cartItems.productId, productId),
                eq(cartItems.startDate, startD),
                eq(cartItems.endDate, endD),
            ),
        });

        if (existing) {
            console.log("Updating existing cart item:", existing.id);
            // Update quantity
            await db
                .update(cartItems)
                .set({ 
                    quantity: existing.quantity + Number(quantity),
                    userId: currentUser?.id || existing.userId
                })
                .where(eq(cartItems.id, existing.id));
        } else {
            const newItemId = uuid();
            console.log("Inserting new cart item:", newItemId);
            await db.insert(cartItems).values({
                id: newItemId,
                sessionId,
                userId: currentUser?.id || null,
                productId,
                quantity: Number(quantity),
                startDate: startD,
                endDate: endD,
                startTime: startTime || null,
                endTime: endTime || null,
                createdAt: new Date(),
            });
        }

        const response = NextResponse.json({ success: true });
        response.cookies.set(SESSION_COOKIE, sessionId, {
            httpOnly: true,
            sameSite: "lax",
            path: "/",
            maxAge: 60 * 60 * 24 * 7,
        });
        return response;
    } catch (err: any) {
        console.error("CART POST ERROR:", err);
        return NextResponse.json(
            { error: "Failed to add to cart: " + (err.message || "Unknown error") },
            { status: 500 }
        );
    }
}

export async function DELETE(req: NextRequest) {
    const sessionId = getSessionId(req);
    const { searchParams } = new URL(req.url);
    const itemId = searchParams.get("id");

    if (itemId) {
        await db
            .delete(cartItems)
            .where(and(eq(cartItems.id, itemId), eq(cartItems.sessionId, sessionId)));
    } else {
        // Clear entire cart
        await db.delete(cartItems).where(eq(cartItems.sessionId, sessionId));
    }

    return NextResponse.json({ success: true });
}

export async function PATCH(req: NextRequest) {
    const sessionId = getSessionId(req);
    const body = await req.json();
    const { id, quantity, startDate, endDate } = body;

    if (!id) {
        return NextResponse.json({ error: "Missing item ID" }, { status: 400 });
    }

    const updateData: any = {};
    if (quantity !== undefined) updateData.quantity = Number(quantity);
    if (startDate) updateData.startDate = new Date(startDate);
    if (endDate) updateData.endDate = new Date(endDate);

    await db
        .update(cartItems)
        .set(updateData)
        .where(and(eq(cartItems.id, id), eq(cartItems.sessionId, sessionId)));

    return NextResponse.json({ success: true });
}
