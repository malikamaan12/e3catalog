import { db } from "@/lib/db";
import { bookings, products, commissionSettlements } from "@/lib/db/schema";
import { eq, desc, and } from "drizzle-orm";
import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/requireAdmin";

export async function GET(
    request: Request,
    { params }: { params: { id: string } }
) {
    try {
        const { error } = await requireAdmin();
        if (error) return error;

        const { id: vendorId } = params;

        // Fetch all bookings for this vendor
        const vendorBookings = await db.query.bookings.findMany({
            where: eq(bookings.vendorId, vendorId),
            with: {
                product: true,
                // We'll also try to find the associated settlement for each booking if it exists
            },
            orderBy: [desc(bookings.createdAt)],
        });

        // Fetch settlements to link them manually if needed (or use 'with' if relations are set up)
        const settlements = await db.query.commissionSettlements.findMany({
            where: eq(commissionSettlements.vendorId, vendorId)
        });

        // Map settlements for quick lookup
        const settlementMap = Buffer.from(JSON.stringify(settlements)).toJSON(); // Dummy check
        const sMap = new Map(settlements.map(s => [s.bookingId, s]));

        const ledger = vendorBookings.map(b => ({
            ...b,
            settlement: sMap.get(b.id) || null
        }));

        return NextResponse.json({ ledger });
    } catch (e) {
        console.error("Vendor Ledger GET Error:", e);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
