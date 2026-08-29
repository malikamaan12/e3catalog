import { db } from "@/lib/db";
import { commissionSettlements, vendors, bookings } from "@/lib/db/schema";
import { eq, desc, and } from "drizzle-orm";
import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/requireAdmin";

export async function GET(request: Request) {
    try {
        const { error } = await requireAdmin();
        if (error) return error;

        const url = new URL(request.url);
        const statusParam = url.searchParams.get("status");

        const whereClause = statusParam && statusParam !== "all"
            ? eq(commissionSettlements.status, statusParam)
            : undefined;

        // Fetch settlements
        const settlements = await db.query.commissionSettlements.findMany({
            where: whereClause,
            with: {
                vendor: true,
                booking: true
            },
            orderBy: [desc(commissionSettlements.createdAt)],
        });

        return NextResponse.json({ settlements });
    } catch (e) {
        console.error("Global Settlements GET Error:", e);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
