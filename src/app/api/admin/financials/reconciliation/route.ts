import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/requireAdmin";
import { getFinancialReconciliation } from "@/lib/invoicing";

export async function GET(req: NextRequest) {
    try {
        const { error } = await requireAdmin(["super_admin", "admin"]);
        if (error) return error;

        const reconciliation = await getFinancialReconciliation();
        return NextResponse.json(reconciliation);
    } catch (e: any) {
        console.error("Financial Reconciliation GET Error:", e);
        return NextResponse.json({ error: e.message || "Internal Server Error" }, { status: 500 });
    }
}
