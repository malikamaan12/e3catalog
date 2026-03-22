import { db } from "@/lib/db";
import { commissionSettlements } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/requireAdmin";

export async function PATCH(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { error } = await requireAdmin();
        if (error) return error;

        const { id: settlementId } = await params;
        const body = await request.json();
        const { adminNotes } = body;

        // Update settlement to approved_paid
        const result = await db.update(commissionSettlements)
            .set({
                status: "approved_paid",
                approvedAt: new Date(),
                adminNotes,
                updatedAt: new Date()
            })
            .where(eq(commissionSettlements.id, settlementId));

        if (!result) {
            return NextResponse.json({ error: "Settlement not found" }, { status: 404 });
        }

        return NextResponse.json({ success: true, message: "Settlement approved successfully" });
    } catch (e) {
        console.error("Settlement Approval Error:", e);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
