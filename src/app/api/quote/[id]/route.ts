import { db } from "@/lib/db";
import { bookings } from "@/lib/db/schema";
import { eq, or } from "drizzle-orm";
import { NextResponse } from "next/server";
import { BOOKING_STATUS } from "@/lib/constants";
import { validateProjectAvailability } from "@/lib/availability";
import { processBookingCommissions } from "@/lib/finance";
import { logStatusTransition } from "@/lib/state-machine";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params;
        const bookingItems = await db.query.bookings.findMany({
            where: or(eq(bookings.id, id), eq(bookings.projectId, id)),
            with: {
                product: {
                    columns: { name: true, slug: true, thumbnailUrl: true, pricePerDay: true },
                },
            },
        });

        if (!bookingItems || bookingItems.length === 0) {
            return NextResponse.json({ error: "Quote not found" }, { status: 404 });
        }

        const booking = bookingItems[0];

        // Security / Privacy check
        if (booking.status === BOOKING_STATUS.REQUEST || booking.status === BOOKING_STATUS.CANCELLED || booking.status === BOOKING_STATUS.UNDELIVERED) {
            return NextResponse.json({ error: "Quote is currently unavailable." }, { status: 403 });
        }

        return NextResponse.json({
            ...booking,
            items: bookingItems,
        });
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
        if (![BOOKING_STATUS.QUOTE_ACCEPTED, BOOKING_STATUS.CHANGES_REQUESTED, BOOKING_STATUS.APPROVED].includes(status) && status !== undefined) {
            return NextResponse.json({ error: "Invalid status transition" }, { status: 400 });
        }

        const projectBookings = await db.query.bookings.findMany({
            where: or(eq(bookings.id, id), eq(bookings.projectId, id)),
        });

        if (projectBookings.length === 0) {
            return NextResponse.json({ error: "Quote not found" }, { status: 404 });
        }

        const firstBooking = projectBookings[0];
        const projectId = firstBooking.projectId || firstBooking.id;

        // If accepting, revalidate availability
        if ([BOOKING_STATUS.QUOTE_ACCEPTED, BOOKING_STATUS.APPROVED].includes(status)) {
            const availabilityCheck = await validateProjectAvailability(
                projectBookings.map(b => ({
                    productId: b.productId,
                    units: b.units,
                    startDate: b.startDate,
                    endDate: b.endDate,
                })),
                { excludeProjectId: projectId }
            );

            if (!availabilityCheck.valid) {
                const conflictMsgs = availabilityCheck.conflicts.map(c => c.error).join(" ");
                return NextResponse.json({
                    error: `Cannot accept quote due to stock conflict: ${conflictMsgs}`,
                }, { status: 409 });
            }
        }

        const updateData: any = {
            updatedAt: new Date(),
        };
        if (status !== undefined) updateData.status = status;
        if (clientNotes !== undefined) updateData.clientNotes = clientNotes;

        await db.transaction(async (tx) => {
            await tx.update(bookings)
                .set(updateData)
                .where(or(eq(bookings.id, projectId), eq(bookings.projectId, projectId)));
        });

        if ([BOOKING_STATUS.QUOTE_ACCEPTED, BOOKING_STATUS.APPROVED].includes(status)) {
            await processBookingCommissions(projectId).catch(console.error);
        }

        await logStatusTransition({
            actorId: firstBooking.userId || "anonymous_client",
            targetId: projectId,
            fromStatus: firstBooking.status,
            toStatus: status || firstBooking.status,
            role: "client",
            details: `Public quote link updated status to ${status}`,
        });

        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error("Client Quote PATCH Error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
