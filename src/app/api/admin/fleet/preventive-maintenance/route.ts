import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { inventoryUnits, maintenanceWorkOrders } from "@/lib/db/schema";
import { requireAdmin } from "@/lib/requireAdmin";
import { USER_ROLES } from "@/lib/constants";
import { calculateAssetMetrics } from "@/lib/depreciation";
import { eq, desc } from "drizzle-orm";
import { v4 as uuid } from "uuid";

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
        });

        const maintenanceQueue = units
            .map(u => ({
                id: u.id,
                assetTagCode: u.assetTagCode,
                productName: u.product?.name || "Equipment Unit",
                vendorName: u.vendor?.companyName || "Internal Fleet",
                conditionStatus: u.conditionStatus,
                availabilityStatus: u.availabilityStatus,
                rentalDaysSinceLastMaintenance: u.rentalDaysSinceLastMaintenance || 0,
                preventiveMaintenanceIntervalDays: u.preventiveMaintenanceIntervalDays || 30,
                operatingHours: u.operatingHours || 0,
                metrics: calculateAssetMetrics(u),
            }))
            .filter(u => u.metrics.isMaintenanceDue || u.metrics.maintenanceUrgency !== "healthy");

        return NextResponse.json({
            count: maintenanceQueue.length,
            queue: maintenanceQueue,
        });
    } catch (e: any) {
        console.error("GET /api/admin/fleet/preventive-maintenance error:", e);
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    const { user, error } = await requireAdmin([
        USER_ROLES.ADMIN,
        USER_ROLES.SUPER_ADMIN,
        USER_ROLES.WAREHOUSE_MANAGER,
    ]);
    if (error) return error;

    try {
        const body = await req.json().catch(() => ({}));
        const { unitId } = body;

        let targetUnits = [];
        if (unitId) {
            const single = await db.query.inventoryUnits.findFirst({
                where: eq(inventoryUnits.id, unitId),
                with: { product: true }
            });
            if (!single) {
                return NextResponse.json({ error: "Unit not found" }, { status: 404 });
            }
            targetUnits = [single];
        } else {
            const all = await db.query.inventoryUnits.findMany({
                with: { product: true }
            });
            targetUnits = all.filter(u => calculateAssetMetrics(u).isMaintenanceDue);
        }

        const generatedWorkOrders = [];

        for (const unit of targetUnits) {
            const metrics = calculateAssetMetrics(unit);
            const woNumber = `WO-PM-${Date.now().toString().slice(-6)}-${Math.floor(Math.random() * 900 + 100)}`;
            const woId = uuid();

            const priority = metrics.maintenanceUrgency === "critical" ? "urgent" : "high";
            const issue = `Automated Preventive Servicing: Unit logged ${unit.rentalDaysSinceLastMaintenance || 0} rental days (threshold: ${unit.preventiveMaintenanceIntervalDays || 30} days). Health Index: ${metrics.healthScore}/100.`;

            await db.insert(maintenanceWorkOrders).values({
                id: woId,
                workOrderNumber: woNumber,
                unitId: unit.id,
                status: "open",
                priority,
                reportedIssue: issue,
                technicianName: user.name || "System Dispatcher",
                laborHours: 0,
                laborRatePerHour: 50,
                totalPartsCost: 0,
                totalRepairCost: 0,
            });

            // Transition availability to maintenance_required and update last maintenance timestamp
            await db.update(inventoryUnits)
                .set({
                    availabilityStatus: "in_maintenance",
                    conditionStatus: "maintenance_required",
                    rentalDaysSinceLastMaintenance: 0,
                    lastMaintenanceDate: new Date(),
                    updatedAt: new Date(),
                })
                .where(eq(inventoryUnits.id, unit.id));

            generatedWorkOrders.push({
                workOrderId: woId,
                workOrderNumber: woNumber,
                unitId: unit.id,
                assetTagCode: unit.assetTagCode,
                productName: unit.product?.name,
                priority,
            });
        }

        return NextResponse.json({
            success: true,
            createdCount: generatedWorkOrders.length,
            workOrders: generatedWorkOrders,
        });
    } catch (e: any) {
        console.error("POST /api/admin/fleet/preventive-maintenance error:", e);
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
