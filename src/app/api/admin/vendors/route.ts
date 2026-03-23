import { db } from "@/lib/db";
import { vendors, users, commissionSettlements } from "@/lib/db/schema";
import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/requireAdmin";
import { desc, sql, eq, and, or } from "drizzle-orm";

export async function GET() {
    try {
        const { error } = await requireAdmin();
        if (error) return error;

        // 1. Fetch Global KPIs
        const stats = await db.select({
            totalActive: sql<number>`count(case when ${vendors.storeStatus} = 'active' then 1 end)`,
            totalCommission: sql<number>`coalesce(sum(case when ${commissionSettlements.status} = 'approved_paid' then ${commissionSettlements.amountOwed} else 0 end), 0)`,
            pendingSettlements: sql<number>`count(case when ${commissionSettlements.status} = 'submitted_for_review' then 1 end)`,
            overdueReceivables: sql<number>`coalesce(sum(case when ${commissionSettlements.status} = 'overdue' then ${commissionSettlements.amountOwed} else 0 end), 0)`,
        }).from(vendors)
        .leftJoin(commissionSettlements, eq(vendors.id, commissionSettlements.vendorId));

        // 2. Fetch Vendors with their specific "Amount Owed" and Account Credentials
        const vendorsWithDebt = await db.select({
            vendor: vendors,
            amountOwed: sql<number>`coalesce(sum(case when ${commissionSettlements.status} in ('pending', 'overdue') then ${commissionSettlements.amountOwed} else 0 end), 0)`,
            user: {
                name: users.name,
                email: users.email
            }
        })
        .from(vendors)
        .leftJoin(commissionSettlements, eq(vendors.id, commissionSettlements.vendorId))
        .innerJoin(users, eq(vendors.userId, users.id))
        .groupBy(vendors.id, users.id)
        .orderBy(desc(vendors.createdAt));

        return NextResponse.json({ 
            vendors: vendorsWithDebt,
            stats: stats[0] 
        });
    } catch (err: any) {
        console.error("GET /api/admin/vendors error:", err);
        return NextResponse.json({ error: "Failed to fetch vendors" }, { status: 500 });
    }
}
