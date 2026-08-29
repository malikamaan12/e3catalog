import { db } from "@/lib/db";
import { cartItems, products } from "@/lib/db/schema";
import { eq, and, or, inArray } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { v4 as uuid } from "uuid";
import { getCurrentUser } from "@/lib/auth";
import { checkAvailability } from "@/lib/availability";
import { format } from "date-fns";

const SESSION_COOKIE = "rental_session";

function getSessionId(req: NextRequest): string {
    return req.cookies.get(SESSION_COOKIE)?.value || uuid();
}

export async function GET(req: NextRequest) {
    try {
        const sessionId = getSessionId(req);
        const currentUser = await getCurrentUser().catch(() => null);

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
                        packagingFee: true,
                        handlingFee: true,
                        setupFee: true,
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

        // If user is logged in, ensure all guest items are linked to their userId
        if (currentUser?.id && items.length > 0) {
            const unlinked = items.filter(item => !item.userId);
            if (unlinked.length > 0) {
                await db.update(cartItems)
                    .set({ userId: currentUser.id })
                    .where(inArray(cartItems.id, unlinked.map(i => i.id)));
            }
        }

        // Live availability check for each item in the cart
        const itemsWithAvailability = await Promise.all(
            items.map(async (item) => {
                try {
                    const startStr = item.startDate instanceof Date 
                        ? format(item.startDate, "yyyy-MM-dd") 
                        : String(item.startDate).split("T")[0];
                    const endStr = item.endDate instanceof Date 
                        ? format(item.endDate, "yyyy-MM-dd") 
                        : String(item.endDate).split("T")[0];

                    const avail = await checkAvailability({
                        productId: item.productId,
                        startDate: startStr,
                        endDate: endStr,
                        quantity: item.quantity,
                        startTime: item.startTime || undefined,
                        endTime: item.endTime || undefined,
                    });

                    return {
                        ...item,
                        isAvailable: avail.available,
                        unitsAvailable: avail.unitsAvailable,
                        unitsMaintenance: avail.unitsMaintenance,
                    };
                } catch {
                    return {
                        ...item,
                        isAvailable: true,
                        unitsAvailable: item.quantity,
                        unitsMaintenance: 0,
                    };
                }
            })
        );

        const response = NextResponse.json(itemsWithAvailability);
        response.cookies.set(SESSION_COOKIE, sessionId, {
            httpOnly: true,
            sameSite: "lax",
            path: "/",
            maxAge: 60 * 60 * 24 * 7, // 7 days
        });
        return response;
    } catch (err: any) {
        console.error("[CART_GET] Error:", err);
        return NextResponse.json([], { status: 200 });
    }
}

export async function POST(req: NextRequest) {
    try {
        const sessionId = getSessionId(req);
        const currentUser = await getCurrentUser().catch(() => null);
        const body = await req.json();

        const { productId, quantity, startDate, endDate, startTime, endTime } = body;

        if (!productId || !quantity || !startDate || !endDate) {
            return NextResponse.json(
                { error: "Missing required fields: productId, quantity, startDate, endDate" },
                { status: 400 }
            );
        }

        const startD = new Date(startDate);
        startD.setHours(0, 0, 0, 0);
        const endD = new Date(endDate);
        endD.setHours(0, 0, 0, 0);

        if (isNaN(startD.getTime()) || isNaN(endD.getTime())) {
            return NextResponse.json({ error: "Invalid start or end date format" }, { status: 400 });
        }

        const today = new Date();
        today.setHours(0, 0, 0, 0);
        if (startD < today) {
            return NextResponse.json({ error: "Rental start date cannot be in the past" }, { status: 400 });
        }

        if (endD < startD) {
            return NextResponse.json({ error: "Rental end date cannot be earlier than start date" }, { status: 400 });
        }

        const requestedQty = Math.max(1, Number(quantity) || 1);

        // Check authoritative live availability
        const startStr = format(startD, "yyyy-MM-dd");
        const endStr = format(endD, "yyyy-MM-dd");
        const avail = await checkAvailability({
            productId,
            startDate: startStr,
            endDate: endStr,
            quantity: requestedQty,
            startTime,
            endTime,
        });

        if (!avail.available && avail.unitsAvailable < requestedQty) {
            return NextResponse.json({
                error: `Only ${avail.unitsAvailable} unit${avail.unitsAvailable === 1 ? '' : 's'} available for the selected dates (${avail.unitsMaintenance} in maintenance).`,
                unitsAvailable: avail.unitsAvailable,
            }, { status: 400 });
        }

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
            const newTotalQty = existing.quantity + requestedQty;
            await db
                .update(cartItems)
                .set({ 
                    quantity: newTotalQty,
                    userId: currentUser?.id || existing.userId
                })
                .where(eq(cartItems.id, existing.id));
        } else {
            const newItemId = uuid();
            await db.insert(cartItems).values({
                id: newItemId,
                sessionId,
                userId: currentUser?.id || null,
                productId,
                quantity: requestedQty,
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
        console.error("[CART_POST] Error:", err);
        return NextResponse.json(
            { error: "Failed to add to cart: " + (err.message || "Unknown error") },
            { status: 500 }
        );
    }
}

export async function DELETE(req: NextRequest) {
    try {
        const sessionId = getSessionId(req);
        const currentUser = await getCurrentUser().catch(() => null);
        const { searchParams } = new URL(req.url);
        const itemId = searchParams.get("id");

        const userOrSession = currentUser?.id
            ? or(eq(cartItems.sessionId, sessionId), eq(cartItems.userId, currentUser.id))
            : eq(cartItems.sessionId, sessionId);

        if (itemId) {
            await db
                .delete(cartItems)
                .where(and(eq(cartItems.id, itemId), userOrSession));
        } else {
            await db.delete(cartItems).where(userOrSession);
        }

        return NextResponse.json({ success: true });
    } catch (err: any) {
        console.error("[CART_DELETE] Error:", err);
        return NextResponse.json({ error: "Failed to delete from cart" }, { status: 500 });
    }
}

export async function PATCH(req: NextRequest) {
    try {
        const sessionId = getSessionId(req);
        const currentUser = await getCurrentUser().catch(() => null);
        const body = await req.json();
        const { id, quantity, startDate, endDate } = body;

        if (!id) {
            return NextResponse.json({ error: "Missing item ID" }, { status: 400 });
        }

        const userOrSession = currentUser?.id
            ? or(eq(cartItems.sessionId, sessionId), eq(cartItems.userId, currentUser.id))
            : eq(cartItems.sessionId, sessionId);

        const existing = await db.query.cartItems.findFirst({
            where: and(eq(cartItems.id, id), userOrSession),
        });

        if (!existing) {
            return NextResponse.json({ error: "Cart item not found" }, { status: 404 });
        }

        const updateData: any = {};
        let finalQty = existing.quantity;
        let finalStart = existing.startDate;
        let finalEnd = existing.endDate;

        if (quantity !== undefined) {
            finalQty = Math.max(1, Number(quantity) || 1);
            updateData.quantity = finalQty;
        }
        
        if (startDate) {
            const sd = new Date(startDate);
            sd.setHours(0, 0, 0, 0);
            if (!isNaN(sd.getTime())) {
                finalStart = sd;
                updateData.startDate = sd;
            }
        }
        if (endDate) {
            const ed = new Date(endDate);
            ed.setHours(0, 0, 0, 0);
            if (!isNaN(ed.getTime())) {
                finalEnd = ed;
                updateData.endDate = ed;
            }
        }

        // Live availability check before update
        const startStr = format(finalStart, "yyyy-MM-dd");
        const endStr = format(finalEnd, "yyyy-MM-dd");
        const avail = await checkAvailability({
            productId: existing.productId,
            startDate: startStr,
            endDate: endStr,
            quantity: finalQty,
        });

        if (!avail.available && avail.unitsAvailable < finalQty) {
            return NextResponse.json({
                error: `Only ${avail.unitsAvailable} unit${avail.unitsAvailable === 1 ? '' : 's'} available for the selected dates.`,
                unitsAvailable: avail.unitsAvailable,
            }, { status: 400 });
        }

        await db
            .update(cartItems)
            .set(updateData)
            .where(eq(cartItems.id, id));

        return NextResponse.json({ success: true });
    } catch (err: any) {
        console.error("[CART_PATCH] Error:", err);
        return NextResponse.json({ error: "Failed to update cart" }, { status: 500 });
    }
}
