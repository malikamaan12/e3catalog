import { db } from "@/lib/db";
import { commissionSettlements, vendorLedgers, bookings, users, vendors } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";
import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { USER_ROLES } from "@/lib/constants";

export async function GET(request: Request) {
    try {
        const { user, error } = await requireAuth();
        if (error || !user || (user.role !== USER_ROLES.VENDOR && user.role !== USER_ROLES.SUPER_ADMIN && user.role !== USER_ROLES.ADMIN)) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
        }

        let vendorId = (user as any).vendorId;

        if (!vendorId) {
            const vendorRec = await db.query.vendors.findFirst({
                where: eq(vendors.userId, user.id),
            });
            if (vendorRec) vendorId = vendorRec.id;
        }

        if (!vendorId) {
            return NextResponse.json({ error: "Vendor profile not found" }, { status: 404 });
        }

        const settlements = await db.query.commissionSettlements.findMany({
            where: eq(commissionSettlements.vendorId, vendorId),
            with: {
                booking: {
                    columns: { 
                        id: true, 
                        projectId: true, 
                        projectName: true, 
                        customerName: true, 
                        startDate: true, 
                        endDate: true,
                        totalPrice: true,
                    },
                },
            },
            orderBy: [desc(commissionSettlements.createdAt)],
        });

        const ledgers = await db.query.vendorLedgers.findMany({
            where: eq(vendorLedgers.vendorId, vendorId),
            with: {
                booking: {
                    columns: { 
                        id: true, 
                        projectId: true, 
                        projectName: true, 
                        startDate: true, 
                        endDate: true,
                    },
                },
            },
            orderBy: [desc(vendorLedgers.createdAt)],
        });

        const totals = {
            grossEarnings: ledgers.reduce((acc, l) => acc + (l.amount || 0), 0),
            platformFees: ledgers.reduce((acc, l) => acc + (l.platformFee || 0), 0),
            netPayouts: ledgers.reduce((acc, l) => acc + (l.vendorPayout || 0), 0),
            pendingPayouts: ledgers.filter(l => l.status === "pending_payout").reduce((acc, l) => acc + (l.vendorPayout || 0), 0),
            settledPayouts: ledgers.filter(l => l.status === "paid").reduce((acc, l) => acc + (l.vendorPayout || 0), 0),
        };

        return NextResponse.json({ 
            settlements,
            ledgers,
            totals,
        });
    } catch (e: any) {
        console.error("Vendor Settlements GET Error:", e);
        return NextResponse.json({ error: e.message || "Internal Server Error" }, { status: 500 });
    }
}
