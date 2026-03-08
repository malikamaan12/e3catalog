import { db } from "@/lib/db";
import { bookings } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const user = await getCurrentUser();
        if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const { id } = await params;

        // Verify ownership before deleting
        const booking = await db.query.bookings.findFirst({
            where: and(
                eq(bookings.id, id),
                eq(bookings.userId, user.id)
            )
        });

        if (!booking) {
            return NextResponse.json({ error: "Item not found or unauthorized" }, { status: 404 });
        }

        // Only allow deletion if it's still in requesting phase
        if (!["request", "changes_requested", "quote_sent"].includes(booking.status)) {
            return NextResponse.json({ error: "Cannot delete items from a firm quote. Please request a revision." }, { status: 403 });
        }

        await db.delete(bookings).where(eq(bookings.id, id));

        return NextResponse.json({ success: true });

    } catch (error) {
        console.error("Dashboard Booking DELETE Error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const user = await getCurrentUser();
        if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const { id } = await params;
        const { units, startDate, endDate, addedByAdmin } = await request.json();

        if (units !== undefined && units < 1) {
            return NextResponse.json({ error: "Units must be at least 1" }, { status: 400 });
        }

        console.log("DASHBOARD PATCH DATA:", { id, user_id: user.id, units, startDate, endDate, addedByAdmin });

        // Verify ownership and status
        const booking = await db.query.bookings.findFirst({
            where: and(
                eq(bookings.id, id),
                eq(bookings.userId, user.id)
            )
        });

        console.log("DB lookup for booking:", booking ? booking.id : "Not Found");

        if (!booking) {
            return NextResponse.json({ error: "Item not found or unauthorized" }, { status: 404 });
        }

        if (!["request", "changes_requested", "quote_sent"].includes(booking.status)) {
            return NextResponse.json({ error: "Cannot modify items on a firm quote. Please request a revision." }, { status: 403 });
        }

        const updateData: any = { updatedAt: new Date().toISOString() };

        if (units !== undefined && !isNaN(Number(units)) && Number(units) >= 1) {
            updateData.units = Number(units);
        }
        if (startDate && startDate.trim() !== "") {
            updateData.startDate = startDate;
        }
        if (endDate && endDate.trim() !== "") {
            updateData.endDate = endDate;
        }
        if (addedByAdmin !== undefined) {
            updateData.addedByAdmin = !!addedByAdmin;
        }

        if (Object.keys(updateData).length > 1) { // more than just updatedAt
            await db.update(bookings)
                .set(updateData)
                .where(eq(bookings.id, id));
        }

        return NextResponse.json({ success: true });

    } catch (error) {
        console.error("Dashboard Booking PATCH Error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
