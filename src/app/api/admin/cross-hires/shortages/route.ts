import { NextRequest, NextResponse } from "next/server";
import { detectBookingShortages } from "@/lib/cross-hire";
import { db } from "@/lib/db";
import { bookings } from "@/lib/db/schema";
import { inArray, desc } from "drizzle-orm";
import { requireAdmin } from "@/lib/requireAdmin";
import { USER_ROLES } from "@/lib/constants";

export async function GET(req: NextRequest) {
    const { user, error } = await requireAdmin([
        USER_ROLES.ADMIN,
        USER_ROLES.SUPER_ADMIN,
        USER_ROLES.WAREHOUSE_MANAGER,
        USER_ROLES.SALES_REP,
    ]);
    if (error) return error;

    try {
        const url = new URL(req.url);
        const bookingId = url.searchParams.get("bookingId");

        if (bookingId) {
            const shortages = await detectBookingShortages(bookingId);
            return NextResponse.json({ shortages });
        }

        // Aggregate across upcoming active bookings
        const activeBookings = await db.query.bookings.findMany({
            where: inArray(bookings.status, ["approved", "booked", "quote_accepted"]),
            orderBy: [desc(bookings.startDate)],
            limit: 15,
        });

        const allShortages = [];
        for (const b of activeBookings) {
            try {
                const s = await detectBookingShortages(b.id);
                if (s.length > 0) {
                    allShortages.push({
                        bookingId: b.id,
                        customerName: b.customerName,
                        startDate: b.startDate,
                        endDate: b.endDate,
                        shortages: s,
                    });
                }
            } catch {}
        }

        return NextResponse.json({ shortageDossiers: allShortages });
    } catch (e: any) {
        console.error("GET /api/admin/cross-hires/shortages error:", e);
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
