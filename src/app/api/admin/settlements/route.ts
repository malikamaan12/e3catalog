import { db } from "@/lib/db";
import { commissionSettlements, vendors, bookings } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";
import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/requireAdmin";

export async function GET(request: Request) {
    try {
        const { user, error } = await requireAdmin(["super_admin", "admin"]);
        if (error) return error;

        const settlements = await db.query.commissionSettlements.findMany({
            with: {
                vendor: true,
                booking: {
                    columns: { id: true, projectName: true, customerName: true }
                }
            },
            orderBy: [desc(commissionSettlements.createdAt)],
        });

        return NextResponse.json({ settlements });
    } catch (e) {
        console.error("Admin Settlements GET Error:", e);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
