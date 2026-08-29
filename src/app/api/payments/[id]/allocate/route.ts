import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { USER_ROLES } from "@/lib/constants";
import { allocatePayment } from "@/lib/invoicing";

export async function POST(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { user, error } = await requireAuth();
        if (error || !user || (user.role !== USER_ROLES.SUPER_ADMIN && user.role !== USER_ROLES.ADMIN && user.role !== USER_ROLES.SALES_REP)) {
            return NextResponse.json({ error: "Unauthorized — Staff role required" }, { status: 403 });
        }

        const { id: paymentId } = await params;
        const body = await req.json();
        const { invoiceId, amount, notes } = body;

        if (!invoiceId || !amount) {
            return NextResponse.json({ error: "Missing required fields: invoiceId and amount" }, { status: 400 });
        }

        const result = await allocatePayment({
            paymentId,
            invoiceId,
            amount: Number(amount),
            allocatedBy: user.id,
            notes,
        });

        return NextResponse.json(result, { status: 201 });
    } catch (e: any) {
        console.error("Payment Allocate POST Error:", e);
        return NextResponse.json({ error: e.message || "Failed to allocate payment" }, { status: 500 });
    }
}
