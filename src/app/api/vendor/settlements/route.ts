import { db } from "@/lib/db";
import { commissionSettlements, bookings, users, vendors } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";
import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { USER_ROLES } from "@/lib/constants";

export async function GET(request: Request) {
    try {
        const { user, error } = await requireAuth();
        if (error || !user || user.role !== USER_ROLES.VENDOR) return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

        // Get vendor id
        const vendorRec = await db.query.vendors.findFirst({
            where: eq(vendors.userId, user.id)
        });

        if (!vendorRec) return NextResponse.json({ error: "Vendor profile not found" }, { status: 404 });

        const settlements = await db.query.commissionSettlements.findMany({
            where: eq(commissionSettlements.vendorId, vendorRec.id),
            with: {
                booking: {
                    columns: { id: true, projectId: true, projectName: true, customerName: true, startDate: true, endDate: true }
                }
            },
            orderBy: [desc(commissionSettlements.createdAt)],
        });

        return NextResponse.json({ settlements });
    } catch (e) {
        console.error("Vendor Settlements GET Error:", e);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
