import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { USER_ROLES } from "@/lib/constants";
import { issueInvoice } from "@/lib/invoicing";

export async function POST(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { user, error } = await requireAuth();
        if (error || !user || (user.role !== USER_ROLES.SUPER_ADMIN && user.role !== USER_ROLES.ADMIN && user.role !== USER_ROLES.SALES_REP)) {
            return NextResponse.json({ error: "Unauthorized — Staff role required" }, { status: 403 });
        }

        const { id } = await params;
        const result = await issueInvoice(id, user.id);

        return NextResponse.json(result);
    } catch (e: any) {
        console.error("Invoice Issue POST Error:", e);
        return NextResponse.json({ error: e.message || "Failed to issue invoice" }, { status: 500 });
    }
}
