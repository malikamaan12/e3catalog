import { db } from "@/lib/db";
import { cartItems, products } from "@/lib/db/schema";
import { eq, and, or, inArray } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { v4 as uuid } from "uuid";
import { getCurrentUser } from "@/lib/auth";

const SESSION_COOKIE = "rental_session";

function getSessionId(req: NextRequest): string {
    return req.cookies.get(SESSION_COOKIE)?.value || uuid();
}

export async function GET(req: NextRequest) {
    try {
        const sessionId = getSessionId(req);
        const currentUser = await getCurrentUser().catch(() => null);

        console.log("Cart GET request:", { sessionId, userId: currentUser?.id });

        // Filter: items must match sessionId OR userId (if user is logged in)
        const whereClause = currentUser?.id 
            ? or(eq(cartItems.sessionId, sessionId), eq(cartItems.userId, currentUser.id))
            : eq(cartItems.sessionId, sessionId);

        const items = await db.query.cartItems.findMany({
            where: whereClause,
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
                        vendorId: true,
                    },
                    with: {
                        vendor: {
                            columns: {
                                id: true,
                                companyName: true,
                            },
                        },
                    },
                },
            },
        });

        // If we found items and user is logged in, ensure they all have their userId set
        if (currentUser?.id && items.length > 0) {
            const itemsToUpdate = items.filter(item => !item.userId);
            if (itemsToUpdate.length > 0) {
                console.log(`Syncing ${itemsToUpdate.length} cart items to userId: ${currentUser.id}`);
                await db.update(cartItems)
                    .set({ userId: currentUser.id })
                    .where(inArray(cartItems.id, itemsToUpdate.map(i => i.id)));
            }
        }

        const response = NextResponse.json(items);
        response.cookies.set(SESSION_COOKIE, sessionId, {
            httpOnly: true,
            sameSite: "lax",
            path: "/",
            maxAge: 60 * 60 * 24 * 7, // 7 days
        });
        return response;
    } catch (err: any) {
        console.error("CART GET ERROR:", err);
        return NextResponse.json([], { status: 200 }); // Return empty array on error to prevent UI crash
    }
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
        startD.setHours(0, 0, 0, 0); // Normalize to midnight
        const endD = new Date(endDate);
        endD.setHours(0, 0, 0, 0); // Normalize to midnight

        // Unified existing check: match by (sessionId OR userId) AND (product + dates)
        const matchClause = currentUser?.id 
            ? or(eq(cartItems.sessionId, sessionId), eq(cartItems.userId, currentUser.id))
            : eq(cartItems.sessionId, sessionId);

        const existing = await db.query.cartItems.findFirst({
            where: and(
                matchClause,
                eq(cartItems.productId, productId),
                eq(cartItems.startDate, startD),
                eq(cartItems.endDate, endD),
            ),
        });

        if (existing) {
            console.log("Updating existing cart item:", existing.id, "New Total:", existing.quantity + Number(quantity));
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
            console.log("Inserting new cart item:", newItemId, { productId, quantity, sessionId });
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
    try {
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
    } catch (err: any) {
        console.error("CART DELETE ERROR:", err);
        return NextResponse.json({ error: "Failed to delete from cart" }, { status: 500 });
    }
}

export async function PATCH(req: NextRequest) {
    try {
        const sessionId = getSessionId(req);
        const body = await req.json();
        const { id, quantity, startDate, endDate } = body;

        if (!id) {
            return NextResponse.json({ error: "Missing item ID" }, { status: 400 });
        }

        const updateData: any = {};
        if (quantity !== undefined) updateData.quantity = Number(quantity);
        
        if (startDate) {
            const sd = new Date(startDate);
            if (!isNaN(sd.getTime())) updateData.startDate = sd;
        }
        if (endDate) {
            const ed = new Date(endDate);
            if (!isNaN(ed.getTime())) updateData.endDate = ed;
        }

        await db
            .update(cartItems)
            .set(updateData)
            .where(and(eq(cartItems.id, id), eq(cartItems.sessionId, sessionId)));

        return NextResponse.json({ success: true });
    } catch (err: any) {
        console.error("CART PATCH ERROR:", err);
        return NextResponse.json({ error: "Failed to update cart" }, { status: 500 });
    }
}
