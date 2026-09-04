import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { maintenanceWorkOrders, inventoryUnits, products, users } from "@/lib/db/schema";
import { eq, desc, and } from "drizzle-orm";
import { requireAdmin } from "@/lib/requireAdmin";
import { USER_ROLES } from "@/lib/constants";
import { v4 as uuid } from "uuid";
import { logAssetLifecycleEvent } from "@/lib/asset-lifecycle";

export async function GET(req: NextRequest) {
    const { user, error } = await requireAdmin([
        USER_ROLES.ADMIN,
        USER_ROLES.SUPER_ADMIN,
        USER_ROLES.WAREHOUSE_MANAGER,
        USER_ROLES.VENDOR,
    ]);
    if (error) return error;

    try {
        const url = new URL(req.url);
        const status = url.searchParams.get("status");
        const priority = url.searchParams.get("priority");
        const unitId = url.searchParams.get("unitId");

        const workOrders = await db.query.maintenanceWorkOrders.findMany({
            where: and(
                status ? eq(maintenanceWorkOrders.status, status) : undefined,
                priority ? eq(maintenanceWorkOrders.priority, priority) : undefined,
                unitId ? eq(maintenanceWorkOrders.unitId, unitId) : undefined
            ),
            orderBy: [desc(maintenanceWorkOrders.createdAt)],
            with: {
                unit: {
                    with: { product: true }
                },
                assignedTechnician: {
                    columns: { id: true, name: true, email: true }
                },
                partsUsed: {
                    with: { sparePart: true }
                }
            }
        });

        return NextResponse.json({ workOrders });
    } catch (e: any) {
        console.error("GET /api/admin/fleet/work-orders error:", e);
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
        const body = await req.json();
        const {
            unitId,
            reportedIssue,
            priority = "medium",
            technicianName,
            assignedTechnicianId,
            laborRatePerHour = 50,
        } = body;

        if (!unitId || !reportedIssue) {
            return NextResponse.json({ error: "unitId and reportedIssue are required." }, { status: 400 });
        }

        const unit = await db.query.inventoryUnits.findFirst({
            where: eq(inventoryUnits.id, unitId),
        });

        if (!unit) {
            return NextResponse.json({ error: "Inventory unit not found." }, { status: 404 });
        }

        const workOrderId = uuid();
        const workOrderNumber = `WO-${Date.now().toString(36).toUpperCase()}`;

        const [created] = await db.insert(maintenanceWorkOrders).values({
            id: workOrderId,
            workOrderNumber,
            unitId,
            assignedTechnicianId: assignedTechnicianId || null,
            technicianName: technicianName || user.name || "Technician",
            status: "open",
            priority,
            reportedIssue,
            laborRatePerHour: parseFloat(laborRatePerHour),
        }).returning();

        // Transition unit status to in_maintenance
        await db.update(inventoryUnits)
            .set({
                availabilityStatus: "in_maintenance",
                conditionStatus: "damaged",
                updatedAt: new Date(),
            })
            .where(eq(inventoryUnits.id, unitId));

        await logAssetLifecycleEvent({
            actorId: user.id,
            unitId,
            assetTagCode: unit.assetTagCode,
            fromStatus: unit.availabilityStatus,
            toStatus: "in_maintenance",
            role: "warehouse_manager",
            note: `Work Order ${workOrderNumber} opened: ${reportedIssue} (Priority: ${priority})`,
        });

        return NextResponse.json({ workOrder: created }, { status: 201 });
    } catch (e: any) {
        console.error("POST /api/admin/fleet/work-orders error:", e);
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
