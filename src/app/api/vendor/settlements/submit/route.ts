import { db } from "@/lib/db";
import { commissionSettlements, vendors } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { USER_ROLES } from "@/lib/constants";

export async function PATCH(request: Request) {
    try {
        const { user, error } = await requireAuth();
        if (error || !user || user.role !== USER_ROLES.VENDOR) return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

        const body = await request.json();
        const { settlementId, paymentEvidenceUrl } = body;

        if (!settlementId || !paymentEvidenceUrl) {
            return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
        }

        // Get vendor id
        const vendorRec = await db.query.vendors.findFirst({
            where: eq(vendors.userId, user.id)
        });

        if (!vendorRec) return NextResponse.json({ error: "Vendor profile not found" }, { status: 404 });

        // Update settlement
        const result = await db.update(commissionSettlements)
            .set({
                paymentEvidenceUrl,
                status: "submitted_for_review",
                submittedAt: new Date(),
                updatedAt: new Date()
            })
            .where(and(
                eq(commissionSettlements.id, settlementId),
                eq(commissionSettlements.vendorId, vendorRec.id)
            ));

        return NextResponse.json({ success: true });
    } catch (e) {
        console.error("Vendor Settlements PATCH Error:", e);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
