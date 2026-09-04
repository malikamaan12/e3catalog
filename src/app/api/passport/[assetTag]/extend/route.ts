import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { inventoryUnits, bookingUnitAssignments, bookings, products } from "@/lib/db/schema";
import { eq, and, sql } from "drizzle-orm";
import { differenceInCalendarDays } from "date-fns";

export async function POST(
    req: NextRequest,
    context: { params: Promise<{ assetTag: string }> }
) {
    const { assetTag } = await context.params;

    try {
        const body = await req.json();
        const { newEndDate, notes } = body;

        if (!newEndDate) {
            return NextResponse.json({ error: "newEndDate is required." }, { status: 400 });
        }

        // 1. Locate Unit
        const unit = await db.query.inventoryUnits.findFirst({
            where: eq(inventoryUnits.assetTagCode, assetTag),
            with: { product: true },
        });

        if (!unit) {
            return NextResponse.json({ error: "Inventory unit not found." }, { status: 404 });
        }

        // 2. Locate Active Assignment / Booking
        const activeAssignment = await db.query.bookingUnitAssignments.findFirst({
            where: and(
                eq(bookingUnitAssignments.inventoryUnitId, unit.id),
                eq(bookingUnitAssignments.status, "dispatched")
            ),
            with: { booking: true },
        });

        if (!activeAssignment || !activeAssignment.booking) {
            return NextResponse.json({ 
                error: "No active on-rent booking assignment found for this unit to extend." 
            }, { status: 400 });
        }

        const booking = activeAssignment.booking;
        const currentEnd = new Date(booking.endDate);
        const requestedEnd = new Date(newEndDate);

        const additionalDays = differenceInCalendarDays(requestedEnd, currentEnd);
        if (additionalDays <= 0) {
            return NextResponse.json({ 
                error: "New end date must be later than current rental end date." 
            }, { status: 400 });
        }

        const pricePerDay = Number(unit.product?.pricePerDay) || 100;
        const unitsCount = Number(booking.units) || 1;
        const proratedAdditionalCost = Math.round(pricePerDay * unitsCount * additionalDays * 100) / 100;

        // 3. Atomically Extend Booking & Add Cost
        await db.update(bookings)
            .set({
                endDate: requestedEnd,
                totalPrice: sql`${bookings.totalPrice} + ${proratedAdditionalCost}`,
                customNotes: booking.customNotes 
                    ? `${booking.customNotes} | Extended +${additionalDays}d on-site by QR (${requestedEnd.toISOString().split("T")[0]})`
                    : `Extended +${additionalDays}d on-site by QR (${requestedEnd.toISOString().split("T")[0]})`,
                updatedAt: new Date(),
            })
            .where(eq(bookings.id, booking.id));

        return NextResponse.json({
            success: true,
            message: `Rental extended by +${additionalDays} day(s) until ${requestedEnd.toISOString().split("T")[0]}.`,
            additionalDays,
            proratedAdditionalCost,
            newEndDate: requestedEnd,
        });
    } catch (e: any) {
        console.error("POST /api/passport/[assetTag]/extend error:", e);
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
