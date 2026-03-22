import { db } from "@/lib/db";
import { commissionSettlements } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/requireAdmin";

export async function PATCH(request: Request) {
    try {
        const { user, error } = await requireAdmin(["super_admin", "admin"]);
        if (error) return error;

        const body = await request.json();
        const { settlementId, status, adminNotes } = body;

        if (!settlementId || !status) {
            return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
        }

        await db.update(commissionSettlements)
            .set({
                status,
                adminNotes,
                approvedAt: status === "approved_paid" ? new Date() : null,
                updatedAt: new Date()
            })
            .where(eq(commissionSettlements.id, settlementId));

        return NextResponse.json({ success: true });
    } catch (e) {
        console.error("Admin Settlements PATCH Error:", e);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
