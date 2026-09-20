import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { inspectionLogs, inventoryUnits, users } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";
import { v4 as uuidv4 } from "uuid";
import { getSession } from "@/lib/auth";
import { createWorkOrderAndClaimFromReturn } from "@/lib/warehouse/maintenance-bridge";

// POST — Create a new inspection log
export async function POST(req: NextRequest) {
    const session = await getSession();
    if (!session || !["admin", "super_admin", "vendor", "warehouse_manager"].includes(session.role)) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const body = await req.json();
        const { unitId, inspectionType, conditionBefore, conditionAfter, notes } = body;

        if (!unitId || !inspectionType || !conditionBefore || !conditionAfter) {
            return NextResponse.json({ error: "unitId, inspectionType, conditionBefore, and conditionAfter are required" }, { status: 400 });
        }

        // 1. Create the inspection log
        const log = await db.insert(inspectionLogs).values({
            id: uuidv4(),
            unitId,
            inspectorId: session.id,
            inspectionType,
            conditionBefore,
            conditionAfter,
            notes: notes || null,
            createdAt: new Date(),
        }).returning();

        // 2. Update the unit's condition and last inspection date
        // If condition After is maintenance_required, we should also set availability to in_maintenance
        const updates: any = {
            conditionStatus: conditionAfter,
            lastInspectionDate: new Date(),
            updatedAt: new Date(),
        };

        let workOrderInfo = undefined;
        let damageClaimInfo = undefined;

        if (["maintenance_required", "damaged", "poor", "needs_repair"].includes(conditionAfter)) {
            updates.availabilityStatus = "in_maintenance";
            const bridgeRes = await createWorkOrderAndClaimFromReturn({
                unitId,
                inspectionLogId: log[0].id,
                conditionAfter,
                reportedIssue: notes || `Inspection flagged condition: ${conditionAfter}`,
                actorId: session.id,
                actorName: session.email || "Technician",
            });
            if (bridgeRes.success) {
                workOrderInfo = bridgeRes.workOrder;
                damageClaimInfo = bridgeRes.damageClaim;
            }
        } else if (["excellent", "good"].includes(conditionAfter)) {
            // Only move back to in_warehouse if it was previously in maintenance
            // Don't override 'on_rent' status if they are just doing a routine check in the field
            const currentUnit = await db.query.inventoryUnits.findFirst({ where: eq(inventoryUnits.id, unitId) });
            if (currentUnit?.availabilityStatus === "in_maintenance") {
                updates.availabilityStatus = "in_warehouse";
            }
        }

        await db.update(inventoryUnits)
            .set(updates)
            .where(eq(inventoryUnits.id, unitId));

        return NextResponse.json({
            ...log[0],
            workOrder: workOrderInfo,
            damageClaim: damageClaimInfo,
        }, { status: 201 });
    } catch (error) {
        console.error("Inspection Log Error:", error);
        return NextResponse.json({ error: "Failed to log inspection" }, { status: 500 });
    }
}

// GET — Fetch inspection history for a unit
export async function GET(req: NextRequest) {
    const session = await getSession();
    if (!session) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const { searchParams } = new URL(req.url);
        const unitId = searchParams.get("unitId");

        if (!unitId) {
            return NextResponse.json({ error: "unitId query param required" }, { status: 400 });
        }

        const logs = await db.select({
            id: inspectionLogs.id,
            unitId: inspectionLogs.unitId,
            inspectorId: inspectionLogs.inspectorId,
            inspectorName: users.name,
            inspectionType: inspectionLogs.inspectionType,
            conditionBefore: inspectionLogs.conditionBefore,
            conditionAfter: inspectionLogs.conditionAfter,
            notes: inspectionLogs.notes,
            createdAt: inspectionLogs.createdAt,
        })
        .from(inspectionLogs)
        .leftJoin(users, eq(inspectionLogs.inspectorId, users.id))
        .where(eq(inspectionLogs.unitId, unitId))
        .orderBy(desc(inspectionLogs.createdAt))
        .limit(50)
        .execute();

        return NextResponse.json(logs);
    } catch (error) {
        console.error("Inspection History Error:", error);
        return NextResponse.json({ error: "Failed to fetch inspection history" }, { status: 500 });
    }
}
