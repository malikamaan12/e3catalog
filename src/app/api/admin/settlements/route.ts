import { db } from "@/lib/db";
import { commissionSettlements, vendors, bookings } from "@/lib/db/schema";
import { eq, desc, and } from "drizzle-orm";
import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/requireAdmin";

export async function GET(request: Request) {
    try {
        const { error } = await requireAdmin();
        if (error) return error;

        // Fetch all settlements submitted for review
        const settlements = await db.query.commissionSettlements.findMany({
            where: eq(commissionSettlements.status, "submitted_for_review"),
            with: {
                vendor: true,
                booking: true
            },
            orderBy: [desc(commissionSettlements.submittedAt)],
        });

        return NextResponse.json({ settlements });
    } catch (e) {
        console.error("Global Settlements GET Error:", e);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
