import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { inventoryUnits, bookings, bookingUnitAssignments } from "@/lib/db/schema";
import { eq, and, inArray, sql, gte } from "drizzle-orm";
import { getSession } from "@/lib/auth";
import { USER_ROLES, BOOKING_STATUS } from "@/lib/constants";

export async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ assetTag: string }> }
) {
    const { assetTag } = await params;

    try {
        const session = await getSession();
        if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        // 1. Find unit and product info
        const unit = await db.query.inventoryUnits.findFirst({
            where: eq(inventoryUnits.assetTagCode, assetTag),
        });

        if (!unit) return NextResponse.json({ error: "Unit not found" }, { status: 404 });

        // 2. Fetch active/upcoming bookings for this product
        // We look for Approved or Booked orders that are not yet completed
        const activeBookings = await db.select({
            id: bookings.id,
            projectName: bookings.projectName,
            customerName: bookings.customerName,
            startDate: bookings.startDate,
            endDate: bookings.endDate,
            unitsRequired: bookings.units,
            unitsAssigned: sql<number>`(SELECT count(*) FROM ${bookingUnitAssignments} WHERE ${bookingUnitAssignments.bookingId} = ${bookings.id})`.mapWith(Number),
        })
        .from(bookings)
        .where(and(
            eq(bookings.productId, unit.productId),
            eq(bookings.vendorId, unit.vendorId),
            inArray(bookings.status, [BOOKING_STATUS.APPROVED, BOOKING_STATUS.BOOKED, BOOKING_STATUS.QUOTE_ACCEPTED]),
            gte(bookings.endDate, new Date()) // Still valid
        ))
        .orderBy(bookings.startDate)
        .execute();

        // 3. Filter only those that still need units
        const availableBookings = activeBookings.filter(b => b.unitsAssigned < b.unitsRequired);

        return NextResponse.json(availableBookings);
    } catch (error) {
        console.error("Fetch Bookings Error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
