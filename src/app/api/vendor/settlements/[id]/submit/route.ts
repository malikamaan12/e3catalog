import { db } from "@/lib/db";
import { commissionSettlements, vendors } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { USER_ROLES } from "@/lib/constants";

export async function POST(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id: settlementId } = await params;
        const { user, error } = await requireAuth();
        if (error || !user || user.role !== USER_ROLES.VENDOR) return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

        const body = await request.json();
        const { paymentEvidenceUrl } = body;

        if (!paymentEvidenceUrl) {
            return NextResponse.json({ error: "Missing evidence URL" }, { status: 400 });
        }

        // Get vendor record
        const vendorRec = await db.query.vendors.findFirst({
            where: eq(vendors.userId, user.id)
        });

        if (!vendorRec) return NextResponse.json({ error: "Vendor profile not found" }, { status: 404 });

        // Update settlement status and evidence
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

        if (!result) {
            return NextResponse.json({ error: "Settlement not found or unauthorized" }, { status: 404 });
        }

        return NextResponse.json({ success: true, message: "Settlement proof submitted successfully" });
    } catch (e) {
        console.error("Vendor Settlement Submit Error:", e);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
