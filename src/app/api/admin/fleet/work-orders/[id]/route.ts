import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { maintenanceWorkOrders, maintenancePartsUsage, spareParts, inventoryUnits } from "@/lib/db/schema";
import { eq, sql } from "drizzle-orm";
import { requireAdmin } from "@/lib/requireAdmin";
import { USER_ROLES } from "@/lib/constants";
import { v4 as uuid } from "uuid";
import { logAssetLifecycleEvent } from "@/lib/asset-lifecycle";

export async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const { user, error } = await requireAdmin([
        USER_ROLES.ADMIN,
        USER_ROLES.SUPER_ADMIN,
        USER_ROLES.WAREHOUSE_MANAGER,
        USER_ROLES.VENDOR,
    ]);
    if (error) return error;

    const { id } = await params;

    try {
        const wo = await db.query.maintenanceWorkOrders.findFirst({
            where: eq(maintenanceWorkOrders.id, id),
            with: {
                unit: {
                    with: { product: true }
                },
                assignedTechnician: true,
                partsUsed: {
                    with: { sparePart: true }
                }
            }
        });

        if (!wo) return NextResponse.json({ error: "Work order not found" }, { status: 404 });
        return NextResponse.json({ workOrder: wo });
    } catch (e: any) {
        console.error("GET work-order error:", e);
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}

export async function PATCH(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const { user, error } = await requireAdmin([
        USER_ROLES.ADMIN,
        USER_ROLES.SUPER_ADMIN,
        USER_ROLES.WAREHOUSE_MANAGER,
    ]);
    if (error) return error;

    const { id } = await params;

    try {
        const body = await req.json();
        const {
            status,
            diagnosticNotes,
            resolutionNotes,
            laborHours,
            newPartUsed, // { sparePartId, quantity }
            electricalSafetyTested,
            patCertificateNumber,
        } = body;

        const wo = await db.query.maintenanceWorkOrders.findFirst({
            where: eq(maintenanceWorkOrders.id, id),
        });

        if (!wo) return NextResponse.json({ error: "Work order not found" }, { status: 404 });

        let currentPartsCost = wo.totalPartsCost || 0;

        // 1. Consume Spare Part if provided
        if (newPartUsed && newPartUsed.sparePartId && newPartUsed.quantity > 0) {
            const part = await db.query.spareParts.findFirst({
                where: eq(spareParts.id, newPartUsed.sparePartId)
            });

            if (!part) {
                return NextResponse.json({ error: "Selected spare part does not exist." }, { status: 404 });
            }

            if (part.stockQuantity < newPartUsed.quantity) {
                return NextResponse.json({ 
                    error: `Insufficient spare part stock. Available: ${part.stockQuantity}, Requested: ${newPartUsed.quantity}` 
                }, { status: 400 });
            }

            const itemTotalCost = part.unitCost * newPartUsed.quantity;

            // Deduct stock
            await db.update(spareParts)
                .set({
                    stockQuantity: sql`${spareParts.stockQuantity} - ${newPartUsed.quantity}`,
                    updatedAt: new Date(),
                })
                .where(eq(spareParts.id, newPartUsed.sparePartId));

            // Record usage
            await db.insert(maintenancePartsUsage).values({
                id: uuid(),
                workOrderId: id,
                sparePartId: newPartUsed.sparePartId,
                quantityUsed: newPartUsed.quantity,
                unitCost: part.unitCost,
                totalCost: itemTotalCost,
            });

            currentPartsCost += itemTotalCost;
        }

        const now = new Date();
        const updatedLaborHours = laborHours !== undefined ? parseFloat(laborHours) : wo.laborHours;
        const laborRate = wo.laborRatePerHour || 50;
        const totalRepairCost = currentPartsCost + (updatedLaborHours * laborRate);

        const isCompleting = status === "completed";

        const [updatedWo] = await db.update(maintenanceWorkOrders)
            .set({
                status: status || wo.status,
                diagnosticNotes: diagnosticNotes !== undefined ? diagnosticNotes : wo.diagnosticNotes,
                resolutionNotes: resolutionNotes !== undefined ? resolutionNotes : wo.resolutionNotes,
                laborHours: updatedLaborHours,
                totalPartsCost: currentPartsCost,
                totalRepairCost,
                electricalSafetyTested: electricalSafetyTested !== undefined ? electricalSafetyTested : wo.electricalSafetyTested,
                patCertificateNumber: patCertificateNumber !== undefined ? patCertificateNumber : wo.patCertificateNumber,
                patPassedAt: electricalSafetyTested ? now : wo.patPassedAt,
                completedAt: isCompleting ? now : wo.completedAt,
                updatedAt: now,
            })
            .where(eq(maintenanceWorkOrders.id, id))
            .returning();

        // If completed: Recommission the unit back to 'in_warehouse' and 'good' condition
        if (isCompleting) {
            await db.update(inventoryUnits)
                .set({
                    availabilityStatus: "in_warehouse",
                    conditionStatus: "good",
                    updatedAt: now,
                })
                .where(eq(inventoryUnits.id, wo.unitId));

            await logAssetLifecycleEvent({
                actorId: user.id,
                unitId: wo.unitId,
                fromStatus: "in_maintenance",
                toStatus: "in_warehouse",
                role: "warehouse_manager",
                note: `Work Order ${wo.workOrderNumber} completed. Total Repair Cost: QAR ${totalRepairCost.toFixed(2)}. Recommissioned to 'in_warehouse'.`,
            });
        }

        return NextResponse.json({
            success: true,
            workOrder: updatedWo,
            message: isCompleting 
                ? "Work Order completed and asset recommissioned to warehouse!" 
                : "Work Order updated successfully."
        });

    } catch (e: any) {
        console.error("PATCH work-order error:", e);
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
