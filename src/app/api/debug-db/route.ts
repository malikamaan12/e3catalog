import { db } from "@/lib/db";
import { bookings, cartItems } from "@/lib/db/schema";
import { NextResponse } from "next/server";

export async function GET() {
    const cart = await db.query.cartItems.findMany({ limit: 5 });
    const b = await db.query.bookings.findMany({ limit: 5, orderBy: (bookings, { desc }) => [desc(bookings.createdAt)] });

    return NextResponse.json({
        cart: cart.map(c => ({ id: c.id, productId: c.productId, quantity: c.quantity })),
        bookings: b.map(x => ({ id: x.id, productId: x.productId, units: x.units }))
    });
}
