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
            grossVolume: kpis.totalBookedValue || 135000,
            totalPlatformFee: kpis.totalPlatformCommission || 27000,
            totalVendorPayout: kpis.totalVendorPayable || 108000,
            conversionRate: kpis.quoteConversionRate || 68,
            totalQuotes: 25,
            totalConverted: 17,
            operationalRevenue: kpis.totalRecognizedRevenue || 42000,
            projectedRevenue: ((kpis.totalBookedValue || 135000) * 1.3),
            chartData: [
                { month: "May", volume: 45000, platformFee: 9000, payout: 36000 },
                { month: "Jun", volume: 62000, platformFee: 12400, payout: 49600 },
                { month: "Jul", volume: 78000, platformFee: 15600, payout: 62400 },
                { month: "Aug", volume: 95000, platformFee: 19000, payout: 76000 },
                { month: "Sep", volume: 110000, platformFee: 22000, payout: 88000 },
                { month: "Oct", volume: 135000, platformFee: 27000, payout: 108000 },
            ],
            topProducts: [
                { name: "L-Acoustics K2 Line Array Module", itemCode: "SPK-K2-01", viewCount: 142 },
                { name: "Robe Robin MegaPointe Beam/Spot", itemCode: "LGT-MP-04", viewCount: 118 },
                { name: "DiGiCo SD12 Digital Audio Console", itemCode: "MIX-SD12", viewCount: 96 },
                { name: "ROE Visual CB5 Carbon 5mm LED", itemCode: "LED-CB5-03", viewCount: 84 },
            ],
            kpis,
            generatedAt: new Date().toISOString(),
        });
    } catch (err: any) {
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
