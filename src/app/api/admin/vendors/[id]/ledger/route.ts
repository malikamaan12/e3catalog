import { db } from "@/lib/db";
import { bookings, products, commissionSettlements, vendorLedgers } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";
import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/requireAdmin";

export async function GET(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { error } = await requireAdmin();
        if (error) return error;

        const { id: vendorId } = await params;

        // Fetch all bookings for this vendor
        const vendorBookings = await db.query.bookings.findMany({
            where: eq(bookings.vendorId, vendorId),
            with: {
                product: true,
            },
            orderBy: [desc(bookings.createdAt)],
        });

        // Fetch settlements
        const settlements = await db.query.commissionSettlements.findMany({
            where: eq(commissionSettlements.vendorId, vendorId),
            orderBy: [desc(commissionSettlements.createdAt)],
        });

        // Fetch ledgers
        const ledgers = await db.query.vendorLedgers.findMany({
            where: eq(vendorLedgers.vendorId, vendorId),
            orderBy: [desc(vendorLedgers.createdAt)],
        });

        const sMap = new Map(settlements.map(s => [s.bookingId, s]));
        const lMap = new Map(ledgers.map(l => [l.bookingId, l]));

        const detailedBookings = vendorBookings.map(b => ({
            ...b,
            settlement: sMap.get(b.id) || null,
            ledger: lMap.get(b.id) || null,
        }));

        const totals = {
            grossEarnings: ledgers.reduce((acc, l) => acc + (l.amount || 0), 0),
            platformFees: ledgers.reduce((acc, l) => acc + (l.platformFee || 0), 0),
            netPayouts: ledgers.reduce((acc, l) => acc + (l.vendorPayout || 0), 0),
            pendingPayouts: ledgers.filter(l => l.status === "pending_payout").reduce((acc, l) => acc + (l.vendorPayout || 0), 0),
            settledPayouts: ledgers.filter(l => l.status === "paid").reduce((acc, l) => acc + (l.vendorPayout || 0), 0),
        };

        return NextResponse.json({ 
            ledger: detailedBookings,
            settlements,
            ledgers,
            totals,
        });
    } catch (e) {
        console.error("Vendor Ledger GET Error:", e);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
