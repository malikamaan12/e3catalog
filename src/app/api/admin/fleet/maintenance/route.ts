import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { maintenanceRecords, inventoryUnits, products, users } from "@/lib/db/schema";
import { eq, desc, and, inArray, sql } from "drizzle-orm";
import { v4 as uuid } from "uuid";
import { requireAdmin } from "@/lib/requireAdmin";
import { ASSET_STATUS, MAINTENANCE_STATUS, USER_ROLES } from "@/lib/constants";
import { logAssetLifecycleEvent } from "@/lib/asset-lifecycle";

/**
 * GET /api/admin/fleet/maintenance
 * Fetch maintenance tickets with unit and product details.
 */
export async function GET(req: NextRequest) {
    const { user, error } = await requireAdmin([
        USER_ROLES.ADMIN,
        USER_ROLES.SUPER_ADMIN,
        USER_ROLES.WAREHOUSE_MANAGER,
        USER_ROLES.VENDOR,
    ]);
    if (error) return error;

    const { searchParams } = new URL(req.url);
    const unitId = searchParams.get("unitId");
    const status = searchParams.get("status");
    const severity = searchParams.get("severity");

    try {
        const records = await db.select({
            id: maintenanceRecords.id,
            unitId: maintenanceRecords.unitId,
            assetTagCode: inventoryUnits.assetTagCode,
            productName: products.name,
            issueCategory: maintenanceRecords.issueCategory,
            severity: maintenanceRecords.severity,
            assignedTechnician: maintenanceRecords.assignedTechnician,
            status: maintenanceRecords.status,
            workNotes: maintenanceRecords.workNotes,
            resolutionNotes: maintenanceRecords.resolutionNotes,
            estimatedCost: maintenanceRecords.estimatedCost,
            actualCost: maintenanceRecords.actualCost,
            openedAt: maintenanceRecords.openedAt,
            targetCompletionDate: maintenanceRecords.targetCompletionDate,
            completedAt: maintenanceRecords.completedAt,
            reporterName: users.name,
        })
        .from(maintenanceRecords)
        .leftJoin(inventoryUnits, eq(maintenanceRecords.unitId, inventoryUnits.id))
        .leftJoin(products, eq(inventoryUnits.productId, products.id))
        .leftJoin(users, eq(maintenanceRecords.reportedBy, users.id))
        .where(and(
            unitId ? eq(maintenanceRecords.unitId, unitId) : undefined,
            status ? eq(maintenanceRecords.status, status) : undefined,
            severity ? eq(maintenanceRecords.severity, severity) : undefined
        ))
        .orderBy(desc(maintenanceRecords.openedAt))
        .limit(100);

        // Hide financial cost fields for warehouse managers if financial blindness is enabled
        if (user.role === USER_ROLES.WAREHOUSE_MANAGER) {
            const sanitized = records.map(r => {
                const copy: any = { ...r };
                delete copy.estimatedCost;
                delete copy.actualCost;
                return copy;
            });
            return NextResponse.json(sanitized);
        }

        return NextResponse.json(records);
    } catch (e: any) {
        console.error("Failed to fetch maintenance records:", e);
        return NextResponse.json({ error: "Failed to fetch maintenance records" }, { status: 500 });
    }
}

/**
 * POST /api/admin/fleet/maintenance
 * Create a maintenance ticket and transition the unit to in_maintenance.
 */
export async function POST(req: NextRequest) {
    const { user, error } = await requireAdmin([
        USER_ROLES.ADMIN,
        USER_ROLES.SUPER_ADMIN,
        USER_ROLES.WAREHOUSE_MANAGER,
        USER_ROLES.VENDOR,
    ]);
    if (error) return error;

    try {
        const body = await req.json();
        const {
            unitId,
            assetTagCode,
            issueCategory,
            severity = "medium",
            assignedTechnician,
            workNotes,
            targetCompletionDate,
            estimatedCost,
        } = body;

        let targetUnitId = unitId;
        if (!targetUnitId && assetTagCode) {
            const found = await db.query.inventoryUnits.findFirst({
                where: eq(inventoryUnits.assetTagCode, assetTagCode.trim().toUpperCase()),
            });
            targetUnitId = found?.id;
        }

        if (!targetUnitId || !issueCategory) {
            return NextResponse.json({ error: "unitId and issueCategory are required" }, { status: 400 });
        }

        const unit = await db.query.inventoryUnits.findFirst({
            where: eq(inventoryUnits.id, targetUnitId),
        });
        if (!unit) return NextResponse.json({ error: "Unit not found" }, { status: 404 });

        const now = new Date();
        const ticketId = uuid();

        await db.transaction(async (tx) => {
            await tx.insert(maintenanceRecords).values({
                id: ticketId,
                unitId: targetUnitId,
                reportedBy: user.id,
                issueCategory,
                severity,
                assignedTechnician: assignedTechnician || null,
                status: MAINTENANCE_STATUS.OPEN,
                workNotes: workNotes || null,
                estimatedCost: estimatedCost ? Number(estimatedCost) : null,
                targetCompletionDate: targetCompletionDate ? new Date(targetCompletionDate) : null,
                openedAt: now,
                createdAt: now,
                updatedAt: now,
            });

            await tx.update(inventoryUnits)
                .set({
                    availabilityStatus: ASSET_STATUS.IN_MAINTENANCE,
                    conditionStatus: "maintenance_required",
                    updatedAt: now,
                })
                .where(eq(inventoryUnits.id, targetUnitId));

            await logAssetLifecycleEvent({
                actorId: user.id,
                unitId: targetUnitId,
                assetTagCode: unit.assetTagCode,
                fromStatus: unit.availabilityStatus,
                toStatus: ASSET_STATUS.IN_MAINTENANCE,
                role: user.role,
                note: `Maintenance ticket opened: [${severity.toUpperCase()}] ${issueCategory} - ${workNotes || ''}`,
            });
        });

        return NextResponse.json({ success: true, ticketId, message: "Maintenance ticket opened successfully." }, { status: 201 });
    } catch (e: any) {
        console.error("Failed to create maintenance ticket:", e);
        return NextResponse.json({ error: e.message || "Failed to create maintenance ticket" }, { status: 500 });
    }
}

/**
 * PATCH /api/admin/fleet/maintenance
 * Update ticket or resolve maintenance.
 */
export async function PATCH(req: NextRequest) {
    const { user, error } = await requireAdmin([
        USER_ROLES.ADMIN,
        USER_ROLES.SUPER_ADMIN,
        USER_ROLES.WAREHOUSE_MANAGER,
        USER_ROLES.VENDOR,
    ]);
    if (error) return error;

    try {
        const body = await req.json();
        const { ticketId, status, workNotes, resolutionNotes, assignedTechnician, actualCost, releaseCondition } = body;

        if (!ticketId) {
            return NextResponse.json({ error: "ticketId is required" }, { status: 400 });
        }

        const ticket = await db.query.maintenanceRecords.findFirst({
            where: eq(maintenanceRecords.id, ticketId),
            with: { unit: true },
        });

        if (!ticket) {
            return NextResponse.json({ error: "Maintenance ticket not found" }, { status: 404 });
        }

        const now = new Date();
        const updates: any = { updatedAt: now };

        if (status) updates.status = status;
        if (workNotes !== undefined) updates.workNotes = workNotes;
        if (resolutionNotes !== undefined) updates.resolutionNotes = resolutionNotes;
        if (assignedTechnician !== undefined) updates.assignedTechnician = assignedTechnician;
        if (actualCost !== undefined) updates.actualCost = Number(actualCost);

        const isCompleting = status === MAINTENANCE_STATUS.COMPLETED;
        if (isCompleting) {
            updates.completedAt = now;
        }

        await db.transaction(async (tx) => {
            await tx.update(maintenanceRecords)
                .set(updates)
                .where(eq(maintenanceRecords.id, ticketId));

            if (isCompleting && ticket.unit) {
                const targetCond = releaseCondition || "good";
                await tx.update(inventoryUnits)
                    .set({
                        availabilityStatus: ASSET_STATUS.IN_WAREHOUSE,
                        conditionStatus: targetCond,
                        lastInspectionDate: now,
                        updatedAt: now,
                    })
                    .where(eq(inventoryUnits.id, ticket.unit.id));

                await logAssetLifecycleEvent({
                    actorId: user.id,
                    unitId: ticket.unit.id,
                    assetTagCode: ticket.unit.assetTagCode,
                    fromStatus: ASSET_STATUS.IN_MAINTENANCE,
                    toStatus: ASSET_STATUS.IN_WAREHOUSE,
                    role: user.role,
                    note: `Maintenance resolved: ${resolutionNotes || 'Service completed'}`,
                });
            }
        });

        return NextResponse.json({ success: true, message: "Maintenance ticket updated successfully." });
    } catch (e: any) {
        console.error("Failed to update maintenance ticket:", e);
        return NextResponse.json({ error: e.message || "Failed to update maintenance ticket" }, { status: 500 });
    }
}
