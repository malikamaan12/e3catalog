import { db } from "@/lib/db";
import { bookings } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { sendQuoteStatusEmail } from "@/lib/email";
import { BOOKING_STATUS } from "@/lib/constants";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const user = await getCurrentUser();
        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const resolvedParams = await params;
        const id = resolvedParams.id;

        // The ID could be a projectId or a specific booking ID
        const projectBookings = await db.query.bookings.findMany({
            where: and(
                eq(bookings.userId, user.id)
            )
        });

        const targetBookings = projectBookings.filter(
            b => b.projectId === id || b.id === id
        );

        if (targetBookings.length === 0) {
            return NextResponse.json({ error: "Quote not found or unauthorized" }, { status: 404 });
        }

        // Check if it's in a state that can be approved
        const firstBooking = targetBookings[0];
        if (firstBooking.status !== BOOKING_STATUS.QUOTE_SENT) {
            return NextResponse.json({ 
                error: `Quote cannot be approved from its current status: ${firstBooking.status}` 
            }, { status: 400 });
        }

        // Apply to all items in the quote
        for (const booking of targetBookings) {
            await db.update(bookings)
                .set({ status: BOOKING_STATUS.QUOTE_ACCEPTED, updatedAt: new Date() })
                .where(eq(bookings.id, booking.id));
        }

        // Send Email Confirmation to Client
        await sendQuoteStatusEmail({
            to: user.email,
            customerName: user.name,
            projectName: firstBooking.projectName || "Your Rental Request",
            projectId: firstBooking.projectId || firstBooking.id,
            status: BOOKING_STATUS.QUOTE_ACCEPTED,
            startDate: firstBooking.startDate instanceof Date 
                ? firstBooking.startDate.toISOString() 
                : new Date(firstBooking.startDate).toISOString(),
            endDate: firstBooking.endDate instanceof Date 
                ? firstBooking.endDate.toISOString() 
                : new Date(firstBooking.endDate).toISOString(),
            totalPrice: firstBooking.totalPrice,
        });

        return NextResponse.json({ 
            success: true, 
            message: "Quote successfully approved and inventory locked." 
        });

    } catch (error: any) {
        console.error("Quote Approve POST Error:", error);
        return NextResponse.json({ error: "Internal Server Error", detail: error?.message }, { status: 500 });
    }
}
