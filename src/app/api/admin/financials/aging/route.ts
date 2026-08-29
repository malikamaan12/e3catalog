import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/requireAdmin";
import { getReceivablesAging } from "@/lib/invoicing";

export async function GET(req: NextRequest) {
    try {
        const { error } = await requireAdmin(["super_admin", "admin"]);
        if (error) return error;

        const aging = await getReceivablesAging();
        return NextResponse.json(aging);
    } catch (e: any) {
        console.error("Receivables Aging GET Error:", e);
        return NextResponse.json({ error: e.message || "Internal Server Error" }, { status: 500 });
    }
}
