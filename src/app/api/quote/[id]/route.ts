import { db } from "@/lib/db";
import { bookings } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params;
        const booking = await db.query.bookings.findFirst({
            where: eq(bookings.id, id),
            with: {
                product: {
                    columns: { name: true, slug: true, thumbnailUrl: true, pricePerDay: true },
                },
            },
        });

        if (!booking) {
            return NextResponse.json({ error: "Quote not found" }, { status: 404 });
        }

        // Security / Privacy: we only return the booking data if the status allows public review
        // (E.g., quote_sent, changes_requested, quote_accepted, approved, booked)
        // Hidden if still 'pending_quote' internal drafting.
        if (booking.status === "request" || booking.status === "cancelled" || booking.status === "undelivered") {
            return NextResponse.json({ error: "Quote is currently unavailable." }, { status: 403 });
        }

        return NextResponse.json(booking);
    } catch (error) {
        console.error("Client Quote GET Error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params;
        const body = await request.json();

        // Client can only update status (accept/request changes) and their own notes
        const { status, clientNotes } = body;

        // Ensure status transitions are legal for a client to do
        if (!["quote_accepted", "changes_requested"].includes(status) && status !== undefined) {
            return NextResponse.json({ error: "Invalid status transition" }, { status: 400 });
        }

        const updateData: any = {};
        if (status !== undefined) updateData.status = status;
        if (clientNotes !== undefined) updateData.clientNotes = clientNotes;

        updateData.updatedAt = new Date().toISOString();

        await db.update(bookings)
            .set(updateData)
            .where(eq(bookings.id, id));

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Client Quote PATCH Error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
