import { db } from "@/lib/db";
import { cartItems, products } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { v4 as uuid } from "uuid";

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
    const sessionId = getSessionId(req);
    const body = await req.json();

    const { productId, quantity, startDate, endDate, startTime, endTime } = body;

    if (!productId || !quantity || !startDate || !endDate) {
        return NextResponse.json(
            { error: "Missing required fields" },
            { status: 400 }
        );
    }

    // Check if same product with same dates already in cart
    const existing = await db.query.cartItems.findFirst({
        where: and(
            eq(cartItems.sessionId, sessionId),
            eq(cartItems.productId, productId),
            eq(cartItems.startDate, startDate),
            eq(cartItems.endDate, endDate),
        ),
    });

    if (existing) {
        // Update quantity
        await db
            .update(cartItems)
            .set({ quantity: existing.quantity + Number(quantity) })
            .where(eq(cartItems.id, existing.id));
    } else {
        await db.insert(cartItems).values({
            id: uuid(),
            sessionId,
            productId,
            quantity: Number(quantity),
            startDate: new Date(startDate),
            endDate: new Date(endDate),
            startTime: startTime || null,
            endTime: endTime || null,
            createdAt: new Date(),
        });
    }

    const response = NextResponse.json({ success: true });
    response.cookies.set(SESSION_COOKIE, sessionId, {
        httpOnly: true,
        sameSite: "lax",
        maxAge: 60 * 60 * 24 * 7,
    });
    return response;
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
