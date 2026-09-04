import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { rentalAgreements, bookings, users, products } from "@/lib/db/schema";
import { eq, desc, and } from "drizzle-orm";
import { getCurrentUser } from "@/lib/auth";
import { v4 as uuid } from "uuid";

export async function GET(req: NextRequest) {
    try {
        const user = await getCurrentUser();
        if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const url = new URL(req.url);
        const bookingId = url.searchParams.get("bookingId");

        const whereClause = bookingId 
            ? eq(rentalAgreements.bookingId, bookingId)
            : (["admin", "super_admin"].includes(user.role) ? undefined : eq(rentalAgreements.clientId, user.id));

        const agreements = await db.query.rentalAgreements.findMany({
            where: whereClause,
            orderBy: [desc(rentalAgreements.createdAt)],
            with: {
                booking: {
                    with: { product: true }
                },
                client: {
                    columns: { id: true, name: true, email: true, phoneNumber: true }
                }
            }
        });

        return NextResponse.json({ agreements });
    } catch (e: any) {
        console.error("GET /api/agreements error:", e);
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    try {
        const user = await getCurrentUser();
        if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const body = await req.json();
        const { bookingId } = body;

        if (!bookingId) {
            return NextResponse.json({ error: "bookingId is required" }, { status: 400 });
        }

        const booking = await db.query.bookings.findFirst({
            where: eq(bookings.id, bookingId),
            with: { product: true }
        });

        if (!booking) {
            return NextResponse.json({ error: "Booking not found" }, { status: 404 });
        }

        // Check if agreement already exists
        const existing = await db.query.rentalAgreements.findFirst({
            where: eq(rentalAgreements.bookingId, bookingId)
        });

        if (existing) {
            return NextResponse.json({ agreement: existing });
        }

        const agreementId = uuid();
        const agreementNumber = `AGR-${Date.now().toString(36).toUpperCase()}`;

        // Standard Qatar Commercial Rental Terms
        const contractTerms = `
1. EQUIPMENT POSSESSION & INSPECTION: The Renter acknowledges receipt of the equipment described herein in clean and optimal working order.
2. REPLACEMENT VALUE & LIABILITY: The Renter assumes full financial responsibility for any loss, theft, damage, or destruction of the equipment during the rental period. Total equipment replacement liability is estimated at QAR ${((booking.product?.pricePerDay || 500) * 12).toLocaleString()}.
3. RETURN & BUMP-OUT: All equipment must be returned promptly at the agreed rental end time. Late returns without prior authorization will incur standard daily rates plus a 25% disruption charge.
4. INDEMNIFICATION & GOVERNING LAW: The Renter shall indemnify and hold harmless Events & Entertainment Enterprises against all claims, liabilities, or injuries arising from equipment operation on-site. This Agreement shall be governed by and construed in accordance with the Laws of the State of Qatar.
        `.trim();

        const replacementValueTotal = (booking.product?.pricePerDay || 500) * 12;
        const securityDepositAmount = (booking.totalPrice || 1000) * 0.20; // 20% deposit

        const [newAgreement] = await db.insert(rentalAgreements).values({
            id: agreementId,
            agreementNumber,
            bookingId,
            projectId: booking.projectId || booking.id,
            clientId: booking.userId || user.id,
            status: "pending_signature",
            contractTerms,
            replacementValueTotal,
            securityDepositAmount,
        }).returning();

        return NextResponse.json({ agreement: newAgreement }, { status: 201 });
    } catch (e: any) {
        console.error("POST /api/agreements error:", e);
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
