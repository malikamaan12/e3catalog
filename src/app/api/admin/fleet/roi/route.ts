import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { inventoryUnits } from "@/lib/db/schema";
import { requireAdmin } from "@/lib/requireAdmin";
import { USER_ROLES } from "@/lib/constants";
import { calculateAssetMetrics } from "@/lib/depreciation";
import { desc } from "drizzle-orm";

export async function GET(req: NextRequest) {
    const { error } = await requireAdmin([
        USER_ROLES.ADMIN,
        USER_ROLES.SUPER_ADMIN,
        USER_ROLES.WAREHOUSE_MANAGER,
    ]);
    if (error) return error;

    try {
        const units = await db.query.inventoryUnits.findMany({
            with: {
                product: true,
                vendor: true,
            },
            orderBy: [desc(inventoryUnits.createdAt)],
            limit: 100,
        });

        let totalCapEx = 0;
        let totalBookValue = 0;
        let totalRevenue = 0;
        let totalMaintenanceSpend = 0;
        let totalHealth = 0;
        let overdueCount = 0;

        const evaluatedUnits = units.map(u => {
            const metrics = calculateAssetMetrics(u);
            totalCapEx += metrics.acquisitionCost;
            totalBookValue += metrics.currentBookValue;
            totalRevenue += metrics.cumulativeRevenue;
            totalMaintenanceSpend += metrics.cumulativeMaintenanceCost;
            totalHealth += metrics.healthScore;
            if (metrics.isMaintenanceDue) overdueCount++;

            return {
                id: u.id,
                assetTagCode: u.assetTagCode,
                serialNumber: u.serialNumber,
                productName: u.product?.name || "Equipment Unit",
                vendorName: u.vendor?.companyName || "Internal Fleet",
                conditionStatus: u.conditionStatus,
                availabilityStatus: u.availabilityStatus,
                purchaseDate: u.purchaseDate,
                totalRentalDays: u.totalRentalDays || 0,
                rentalDaysSinceLastMaintenance: u.rentalDaysSinceLastMaintenance || 0,
                operatingHours: u.operatingHours || 0,
                metrics,
            };
        });

        const totalProfit = totalRevenue - totalMaintenanceSpend;
        const fleetNetRoi = totalCapEx > 0 ? Number(((totalProfit / totalCapEx) * 100).toFixed(1)) : 0;
        const averageHealthScore = units.length > 0 ? Math.round(totalHealth / units.length) : 100;

        return NextResponse.json({
            summary: {
                totalUnitsCount: units.length,
                totalCapEx,
                totalBookValue: Number(totalBookValue.toFixed(2)),
                totalRevenue,
                totalMaintenanceSpend,
                fleetNetRoi,
                averageHealthScore,
                overdueMaintenanceCount: overdueCount,
            },
            units: evaluatedUnits,
        });
    } catch (e: any) {
        console.error("GET /api/admin/fleet/roi error:", e);
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
