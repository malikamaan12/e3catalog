import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { computeOperationalKpis } from "@/lib/analytics";
import { hasPermission } from "@/lib/permissions";

export async function GET(req: Request) {
    try {
        const { user, error } = await requireAuth();
        if (error || !user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        if (!hasPermission(user.role, "view_financial_analytics")) {
            return NextResponse.json({ error: "Forbidden: Warehouse and restricted roles cannot access financial analytics" }, { status: 403 });
        }

        const url = new URL(req.url);
        const vendorId = url.searchParams.get("vendorId") || undefined;
        const clientId = url.searchParams.get("clientId") || undefined;

        const kpis = await computeOperationalKpis({
            vendorId,
            clientId,
        });

        return NextResponse.json({
            kpis,
            generatedAt: new Date().toISOString(),
        });
    } catch (err: any) {
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
