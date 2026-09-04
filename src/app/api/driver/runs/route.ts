import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { bookings, bookingDispatchLogs, proofOfDeliveries, products } from "@/lib/db/schema";
import { eq, desc, and, inArray } from "drizzle-orm";
import { getCurrentUser } from "@/lib/auth";

export async function GET(req: NextRequest) {
    try {
        const user = await getCurrentUser();

        // Fetch bookings scheduled for delivery or currently out for delivery
        const activeBookings = await db.query.bookings.findMany({
            where: inArray(bookings.status, ["approved", "booked", "staged", "dispatched", "on_rent"]),
            orderBy: [desc(bookings.startDate)],
            with: {
                product: {
                    columns: { id: true, name: true, itemCode: true, thumbnailUrl: true }
                },
                dispatchLog: true,
                proofOfDelivery: true,
            },
            limit: 30,
        });

        const runs = activeBookings.map(b => ({
            id: b.id,
            projectId: b.projectId || b.id,
            projectName: b.projectName || "Event Production Setup",
            customerName: b.customerName,
            customerPhone: b.customerPhone,
            customerEmail: b.customerEmail,
            venueAddress: b.notes || b.customNotes || "Qatar National Convention Centre (QNCC), Doha",
            deliveryDate: b.startDate,
            status: b.status,
            units: b.units,
            product: b.product,
            driverName: b.dispatchLog?.driverName || "Assigned Driver",
            vehiclePlateNumber: b.dispatchLog?.vehiclePlateNumber || "QA Fleet",
            isDelivered: !!b.proofOfDelivery,
            deliveredAt: b.proofOfDelivery?.deliveredAt,
        }));

        return NextResponse.json({ runs });
    } catch (e: any) {
        console.error("GET /api/driver/runs error:", e);
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
