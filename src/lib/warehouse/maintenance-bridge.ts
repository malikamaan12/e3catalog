import { db } from "@/lib/db";
import { 
    maintenanceWorkOrders, 
    damageClaims, 
    inventoryUnits 
} from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { v4 as uuidv4 } from "uuid";
import { logAssetLifecycleEvent } from "@/lib/asset-lifecycle";

export interface MaintenanceTriggerParams {
    unitId: string;
    inspectionLogId?: string;
    bookingId?: string;
    conditionAfter: string;
    reportedIssue?: string;
    actorId?: string;
    actorName?: string;
    severity?: "minor" | "moderate" | "severe" | "total_loss";
    estimatedLaborHours?: number;
    laborRatePerHour?: number;
}

export interface MaintenanceBridgeResult {
    success: boolean;
    workOrder?: {
        id: string;
        workOrderNumber: string;
        status: string;
        priority: string;
    };
    damageClaim?: {
        id: string;
        claimNumber: string;
        status: string;
    };
    error?: string;
}

/**
 * Automatically creates a Maintenance Work Order and, if tied to a booking,
 * a Customer Damage Claim when equipment is checked in as damaged or requiring repair.
 */
export async function createWorkOrderAndClaimFromReturn(
    params: MaintenanceTriggerParams
): Promise<MaintenanceBridgeResult> {
    try {
        const {
            unitId,
            inspectionLogId,
            bookingId,
            conditionAfter,
            reportedIssue,
            actorId,
            actorName,
            severity = conditionAfter === "damaged" ? "moderate" : "minor",
            estimatedLaborHours = 2.0,
            laborRatePerHour = 50.0,
        } = params;

        // Fetch unit details
        const [unit] = await db
            .select()
            .from(inventoryUnits)
            .where(eq(inventoryUnits.id, unitId))
            .limit(1);

        if (!unit) {
            return { success: false, error: `Inventory unit ${unitId} not found` };
        }

        const now = new Date();
        const year = now.getFullYear();
        const randomSuffix = Math.floor(1000 + Math.random() * 9000);

        // Determine priority
        let priority = "medium";
        if (severity === "total_loss" || severity === "severe") {
            priority = "urgent";
        } else if (conditionAfter === "damaged" || severity === "moderate") {
            priority = "high";
        }

        // 1. Create Maintenance Work Order
        const workOrderId = uuidv4();
        const workOrderNumber = `WO-${year}-${randomSuffix}`;
        const issueText = reportedIssue || `Automated QC Ticket: Asset returned in '${conditionAfter}' condition. Requires diagnostic inspection and repair.`;

        const [workOrder] = await db
            .insert(maintenanceWorkOrders)
            .values({
                id: workOrderId,
                workOrderNumber,
                unitId,
                technicianName: actorName || "Warehouse Lead Technician",
                status: "open",
                priority,
                reportedIssue: issueText,
                laborHours: estimatedLaborHours,
                laborRatePerHour,
                totalRepairCost: estimatedLaborHours * laborRatePerHour,
                electricalSafetyTested: false,
                createdAt: now,
                updatedAt: now,
            })
            .returning();

        // 2. Transition Unit Status to in_maintenance
        await db
            .update(inventoryUnits)
            .set({
                availabilityStatus: "in_maintenance",
                conditionStatus: conditionAfter,
                lastInspectionDate: now,
                updatedAt: now,
            })
            .where(eq(inventoryUnits.id, unitId));

        if (actorId) {
            await logAssetLifecycleEvent({
                actorId,
                unitId: unit.id,
                assetTagCode: unit.assetTagCode,
                fromStatus: unit.availabilityStatus,
                toStatus: "in_maintenance",
                role: "warehouse_technician",
                bookingId,
                note: `Automatic work order ${workOrderNumber} logged. Unit moved to in_maintenance.`,
            });
        }

        // 3. If associated with an active booking, create a Damage Claim
        let createdClaim: any = null;
        if (bookingId) {
            const claimId = uuidv4();
            const claimNumber = `CLM-${year}-${randomSuffix}`;

            const [claim] = await db
                .insert(damageClaims)
                .values({
                    id: claimId,
                    claimNumber,
                    bookingId,
                    inventoryUnitId: unitId,
                    inspectionLogId: inspectionLogId || null,
                    incidentDescription: `Asset ${unit.assetTagCode} returned in '${conditionAfter}' condition. Inspection note: ${issueText}`,
                    severity,
                    laborCost: estimatedLaborHours * laborRatePerHour,
                    partsCost: 0,
                    totalClaimAmount: estimatedLaborHours * laborRatePerHour,
                    status: "filed",
                    filedBy: actorId || null,
                    createdAt: now,
                    updatedAt: now,
                })
                .returning();

            createdClaim = claim;
        }

        return {
            success: true,
            workOrder: {
                id: workOrder.id,
                workOrderNumber: workOrder.workOrderNumber,
                status: workOrder.status,
                priority: workOrder.priority,
            },
            damageClaim: createdClaim ? {
                id: createdClaim.id,
                claimNumber: createdClaim.claimNumber,
                status: createdClaim.status,
            } : undefined,
        };
    } catch (err: any) {
        console.error("Error in createWorkOrderAndClaimFromReturn:", err);
        return { success: false, error: err.message };
    }
}
