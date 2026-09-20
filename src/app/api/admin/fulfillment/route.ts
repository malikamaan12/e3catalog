import { db } from "@/lib/db";
import { 
    bookings, 
    inventoryUnits, 
    bookingUnitAssignments, 
    products, 
    inspectionLogs,
    systemLogs,
    flightCases,
    flightCaseContents
} from "@/lib/db/schema";
import { eq, and, sql, or, inArray } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { v4 as uuid } from "uuid";
import { requireAdmin } from "@/lib/requireAdmin";
import { ASSET_STATUS, USER_ROLES } from "@/lib/constants";
import { 
    autoAllocateBookingUnits, 
    manualAllocateUnit, 
    releaseUnitAllocation 
} from "@/lib/allocation-engine";
import { isValidAssetTransition, logAssetLifecycleEvent } from "@/lib/asset-lifecycle";
import { createWorkOrderAndClaimFromReturn } from "@/lib/warehouse/maintenance-bridge";

/**
 * GET /api/admin/fulfillment?bookingId=...
 * Returns booking details + progressive fulfillment stages for warehouse operations.
 */
export async function GET(req: NextRequest) {
    const { user, error } = await requireAdmin([
        USER_ROLES.ADMIN, 
        USER_ROLES.SUPER_ADMIN, 
        USER_ROLES.WAREHOUSE_MANAGER, 
        USER_ROLES.VENDOR
    ]);
    if (error) return error;

    const { searchParams } = new URL(req.url);
    const bookingId = searchParams.get("bookingId");

    if (!bookingId) {
        return NextResponse.json({ error: "Booking ID is required" }, { status: 400 });
    }

    const bookingRes = await db.query.bookings.findFirst({
        where: eq(bookings.id, bookingId),
        with: {
            product: true,
            unitAssignments: {
                with: {
                    inventoryUnit: true,
                },
            },
        },
    });

    if (!bookingRes) {
        return NextResponse.json({ error: "Booking not found" }, { status: 404 });
    }

    // Tenant Isolation
    if (user.role === USER_ROLES.VENDOR && bookingRes.vendorId !== (user as any).vendorId) {
        return NextResponse.json({ error: "Forbidden: Tenant isolation mismatch" }, { status: 403 });
    }

    // Role-based redaction for Warehouse Managers (Financial Blindness)
    if (user.role === USER_ROLES.WAREHOUSE_MANAGER) {
        const sanitized: any = { ...bookingRes };
        delete sanitized.totalPrice;
        delete sanitized.discount;
        delete sanitized.logisticsCost;
        delete sanitized.laborCost;
        delete sanitized.additionalChargeAmount;
        delete sanitized.customerEmail;
        
        if (sanitized.product) {
            const sanitizedProd = { ...sanitized.product };
            delete sanitizedProd.pricePerDay;
            delete sanitizedProd.pricePerHour;
            sanitized.product = sanitizedProd;
        }

        return NextResponse.json(sanitized);
    }

    return NextResponse.json(bookingRes);
}

/**
 * Helper to resolve units and expand flight case contents from a list of scanned tags (Asset Tag or RFID EPC)
 */
async function resolveUnitsAndCases(tags: string[]) {
    const cleanTags = Array.from(new Set(tags.map(t => String(t).trim().toUpperCase()).filter(Boolean)));
    if (cleanTags.length === 0) return { units: [], cases: [], cleanTags: [] };

    // 1. Direct Inventory Unit lookup by assetTagCode OR rfidTag
    const units = await db.select().from(inventoryUnits).where(
        or(
            inArray(inventoryUnits.assetTagCode, cleanTags),
            inArray(inventoryUnits.rfidTag, cleanTags)
        )
    );

    // 2. Flight Case lookup by assetTagCode OR rfidTag
    const cases = await db.select().from(flightCases).where(
        or(
            inArray(flightCases.assetTagCode, cleanTags),
            inArray(flightCases.rfidTag, cleanTags)
        )
    );

    // If any flight cases matched, expand their child contents into units
    if (cases.length > 0) {
        const caseIds = cases.map(c => c.id);
        const caseContents = await db.select({
            unitId: flightCaseContents.inventoryUnitId
        })
        .from(flightCaseContents)
        .where(inArray(flightCaseContents.flightCaseId, caseIds));

        const childUnitIds = caseContents.map(c => c.unitId).filter(Boolean) as string[];
        if (childUnitIds.length > 0) {
            const childUnits = await db.select().from(inventoryUnits).where(
                inArray(inventoryUnits.id, childUnitIds)
            );
            for (const cu of childUnits) {
                if (!units.some(u => u.id === cu.id)) {
                    units.push(cu);
                }
            }
        }
    }

    return { units, cases, cleanTags };
}

/**
 * POST /api/admin/fulfillment
 * Warehouse Fulfillment Actions:
 *  - auto_allocate: Deterministic auto-allocation
 *  - manual_allocate: Scan / select asset tag to allocate (supports RFID EPC)
 *  - release: Release unit back to warehouse floor
 *  - stage / bulk_stage: Mark unit(s) as staged in bay (batch RFID safe)
 *  - pack / bulk_pack: Mark unit(s) as packed in flight case / container
 *  - dispatch / bulk_dispatch: Mark unit(s) as dispatched with driver
 *  - return / bulk_return: Check in returned unit(s) (sends to quarantine / awaiting_inspection)
 *  - override_pack: Complete packing with documented exception
 */
export async function POST(req: NextRequest) {
    const { user, error } = await requireAdmin([
        USER_ROLES.ADMIN, 
        USER_ROLES.SUPER_ADMIN, 
        USER_ROLES.WAREHOUSE_MANAGER, 
        USER_ROLES.VENDOR
    ]);
    if (error) return error;

    const body = await req.json();
    const { 
        bookingId, 
        assetTag, 
        tags,
        unitId,
        assignmentId,
        action, 
        condition, 
        notes, 
        overrideReason 
    } = body;

    if (!bookingId || !action) {
        return NextResponse.json({ error: "Missing required fields: bookingId and action" }, { status: 400 });
    }

    const now = new Date();

    // ─── ACTION 1: AUTO ALLOCATE ───
    if (action === "auto_allocate") {
        const result = await autoAllocateBookingUnits({
            bookingId,
            actorId: user.id,
            role: user.role,
        });
        if (!result.success) {
            return NextResponse.json({ error: result.error || "Auto-allocation failed" }, { status: 400 });
        }
        return NextResponse.json(result);
    }

    // ─── ACTION 2: MANUAL ALLOCATE BY TAG (DUAL ASSET TAG / RFID EPC) ───
    if (action === "manual_allocate") {
        if (!assetTag) return NextResponse.json({ error: "assetTag is required" }, { status: 400 });
        const result = await manualAllocateUnit({
            bookingId,
            assetTagCode: assetTag,
            actorId: user.id,
            role: user.role,
        });
        if (!result.success) {
            return NextResponse.json({ error: result.error || "Allocation failed" }, { status: 400 });
        }
        return NextResponse.json(result);
    }

    // ─── ACTION 3: RELEASE ALLOCATION ───
    if (action === "release") {
        const cleanTag = assetTag?.trim().toUpperCase();
        const targetUnitId = unitId || (cleanTag ? (await db.query.inventoryUnits.findFirst({
            where: or(eq(inventoryUnits.assetTagCode, cleanTag), eq(inventoryUnits.rfidTag, cleanTag))
        }))?.id : null);

        if (!targetUnitId) return NextResponse.json({ error: "unitId or valid assetTag required" }, { status: 400 });
        
        const result = await releaseUnitAllocation({
            bookingId,
            unitId: targetUnitId,
            actorId: user.id,
            role: user.role,
            reason: notes,
        });
        if (!result.success) {
            return NextResponse.json({ error: result.error || "Release failed" }, { status: 400 });
        }
        return NextResponse.json(result);
    }

    // ─── BATCH RFID / STREAM PROCESSING (High-Speed Ingestion Pipeline) ───
    const isBatch = action.startsWith("bulk_") || (Array.isArray(tags) && tags.length > 0);
    if (isBatch) {
        const rawTags = (tags || (assetTag ? [assetTag] : [])).filter(Boolean);
        const { units, cases, cleanTags } = await resolveUnitsAndCases(rawTags);

        if (units.length === 0 && cases.length === 0) {
            return NextResponse.json({
                error: "None of the scanned tags were recognized in inventory or flight cases.",
                scannedCount: cleanTags.length,
            }, { status: 404 });
        }

        const unitIds = units.map(u => u.id);
        const assignments = unitIds.length > 0 
            ? await db.select().from(bookingUnitAssignments).where(
                and(
                    eq(bookingUnitAssignments.bookingId, bookingId),
                    inArray(bookingUnitAssignments.inventoryUnitId, unitIds)
                )
            )
            : [];

        const normalizedAction = action.replace("bulk_", "");

        if (normalizedAction === "stage") {
            await db.transaction(async (tx) => {
                const assignmentIds = assignments.map(a => a.id);
                if (assignmentIds.length > 0) {
                    await tx.update(bookingUnitAssignments)
                        .set({ status: "staged" })
                        .where(inArray(bookingUnitAssignments.id, assignmentIds));
                }
                if (unitIds.length > 0) {
                    await tx.update(inventoryUnits)
                        .set({ availabilityStatus: ASSET_STATUS.STAGED, updatedAt: now })
                        .where(inArray(inventoryUnits.id, unitIds));
                }
                for (const u of units) {
                    await logAssetLifecycleEvent({
                        actorId: user.id,
                        unitId: u.id,
                        assetTagCode: u.assetTagCode,
                        fromStatus: u.availabilityStatus,
                        toStatus: ASSET_STATUS.STAGED,
                        role: user.role,
                        bookingId,
                        note: notes || "Batch staged via RFID stream",
                    });
                }
            });
            return NextResponse.json({
                success: true,
                action: "bulk_stage",
                processedCount: units.length,
                assignedCount: assignments.length,
                casesExpandedCount: cases.length,
                totalScanned: cleanTags.length,
                message: `Successfully staged ${units.length} unit(s) in bay.`
            });
        }

        if (normalizedAction === "pack") {
            await db.transaction(async (tx) => {
                const assignmentIds = assignments.map(a => a.id);
                if (assignmentIds.length > 0) {
                    await tx.update(bookingUnitAssignments)
                        .set({ status: "packed" })
                        .where(inArray(bookingUnitAssignments.id, assignmentIds));
                }
                if (unitIds.length > 0) {
                    await tx.update(inventoryUnits)
                        .set({ availabilityStatus: ASSET_STATUS.PACKED, updatedAt: now })
                        .where(inArray(inventoryUnits.id, unitIds));
                }
                if (cases.length > 0) {
                    await tx.update(flightCases)
                        .set({ status: "packed", updatedAt: now })
                        .where(inArray(flightCases.id, cases.map(c => c.id)));
                }
                for (const u of units) {
                    await logAssetLifecycleEvent({
                        actorId: user.id,
                        unitId: u.id,
                        assetTagCode: u.assetTagCode,
                        fromStatus: u.availabilityStatus,
                        toStatus: ASSET_STATUS.PACKED,
                        role: user.role,
                        bookingId,
                        note: notes || "Batch packed via RFID stream",
                    });
                }
            });
            return NextResponse.json({
                success: true,
                action: "bulk_pack",
                processedCount: units.length,
                assignedCount: assignments.length,
                casesExpandedCount: cases.length,
                totalScanned: cleanTags.length,
                message: `Successfully packed ${units.length} unit(s).`
            });
        }

        if (normalizedAction === "dispatch") {
            await db.transaction(async (tx) => {
                const assignmentIds = assignments.map(a => a.id);
                if (assignmentIds.length > 0) {
                    await tx.update(bookingUnitAssignments)
                        .set({ status: "dispatched" })
                        .where(inArray(bookingUnitAssignments.id, assignmentIds));
                }
                if (unitIds.length > 0) {
                    await tx.update(inventoryUnits)
                        .set({ availabilityStatus: ASSET_STATUS.ON_RENT, updatedAt: now })
                        .where(inArray(inventoryUnits.id, unitIds));
                }
                if (cases.length > 0) {
                    await tx.update(flightCases)
                        .set({ status: "in_transit", updatedAt: now })
                        .where(inArray(flightCases.id, cases.map(c => c.id)));
                }
                for (const u of units) {
                    await logAssetLifecycleEvent({
                        actorId: user.id,
                        unitId: u.id,
                        assetTagCode: u.assetTagCode,
                        fromStatus: u.availabilityStatus,
                        toStatus: ASSET_STATUS.ON_RENT,
                        role: user.role,
                        bookingId,
                        note: notes || "Batch dispatched via RFID stream",
                    });
                }
            });
            return NextResponse.json({
                success: true,
                action: "bulk_dispatch",
                processedCount: units.length,
                assignedCount: assignments.length,
                casesExpandedCount: cases.length,
                totalScanned: cleanTags.length,
                message: `Successfully dispatched ${units.length} unit(s).`
            });
        }

        if (normalizedAction === "return") {
            const newCondition = condition || "good";
            const needsMaintenance = newCondition === "maintenance_required" || newCondition === "poor";
            const targetStatus = needsMaintenance ? ASSET_STATUS.IN_MAINTENANCE : ASSET_STATUS.AWAITING_INSPECTION;

            await db.transaction(async (tx) => {
                const assignmentIds = assignments.map(a => a.id);
                if (assignmentIds.length > 0) {
                    await tx.update(bookingUnitAssignments)
                        .set({ status: "returned", scannedInAt: now })
                        .where(inArray(bookingUnitAssignments.id, assignmentIds));
                }
                if (unitIds.length > 0) {
                    await tx.update(inventoryUnits)
                        .set({
                            availabilityStatus: targetStatus,
                            conditionStatus: newCondition,
                            lastInspectionDate: now,
                            updatedAt: now,
                        })
                        .where(inArray(inventoryUnits.id, unitIds));
                }
                if (cases.length > 0) {
                    await tx.update(flightCases)
                        .set({ status: "available", updatedAt: now })
                        .where(inArray(flightCases.id, cases.map(c => c.id)));
                }
                for (const u of units) {
                    const logId = uuid();
                    await tx.insert(inspectionLogs).values({
                        id: logId,
                        unitId: u.id,
                        inspectorId: user.id,
                        inspectionType: "return",
                        conditionBefore: u.conditionStatus,
                        conditionAfter: newCondition,
                        notes: notes || `Batch return from booking ${bookingId}`,
                        createdAt: now,
                    });
                    await logAssetLifecycleEvent({
                        actorId: user.id,
                        unitId: u.id,
                        assetTagCode: u.assetTagCode,
                        fromStatus: u.availabilityStatus,
                        toStatus: targetStatus,
                        role: user.role,
                        bookingId,
                        note: `Batch return dock check-in: condition ${newCondition}`,
                    });
                }
            });

            if (["damaged", "needs_repair", "maintenance_required", "poor"].includes(newCondition)) {
                for (const u of units) {
                    await createWorkOrderAndClaimFromReturn({
                        unitId: u.id,
                        bookingId,
                        conditionAfter: newCondition,
                        reportedIssue: notes || `Batch return from booking ${bookingId} with condition ${newCondition}`,
                        actorId: user.id,
                        actorName: user.name || "Warehouse Technician",
                    });
                }
            }

            return NextResponse.json({
                success: true,
                action: "bulk_return",
                processedCount: units.length,
                assignedCount: assignments.length,
                casesExpandedCount: cases.length,
                totalScanned: cleanTags.length,
                message: `Successfully returned ${units.length} unit(s). Placed in awaiting inspection.`
            });
        }
    }

    // ─── ACTION 4: SINGLE STAGE UNIT (Move to Bay) ───
    if (action === "stage") {
        const cleanTag = assetTag?.trim().toUpperCase();
        const unit = await db.query.inventoryUnits.findFirst({
            where: cleanTag 
                ? or(eq(inventoryUnits.assetTagCode, cleanTag), eq(inventoryUnits.rfidTag, cleanTag))
                : eq(inventoryUnits.id, unitId),
        });
        if (!unit) return NextResponse.json({ error: "Asset unit not found" }, { status: 404 });

        await db.transaction(async (tx) => {
            await tx.update(bookingUnitAssignments)
                .set({ status: "staged" })
                .where(and(
                    eq(bookingUnitAssignments.bookingId, bookingId),
                    eq(bookingUnitAssignments.inventoryUnitId, unit.id)
                ));

            await tx.update(inventoryUnits)
                .set({ availabilityStatus: ASSET_STATUS.STAGED, updatedAt: now })
                .where(eq(inventoryUnits.id, unit.id));

            await logAssetLifecycleEvent({
                actorId: user.id,
                unitId: unit.id,
                assetTagCode: unit.assetTagCode,
                fromStatus: unit.availabilityStatus,
                toStatus: ASSET_STATUS.STAGED,
                role: user.role,
                bookingId,
                note: notes || "Moved to staging bay",
            });
        });

        return NextResponse.json({ success: true, message: `Asset ${unit.assetTagCode} staged in bay.` });
    }

    // ─── ACTION 5: SINGLE PACK UNIT ───
    if (action === "pack") {
        const cleanTag = assetTag?.trim().toUpperCase();
        const unit = await db.query.inventoryUnits.findFirst({
            where: cleanTag 
                ? or(eq(inventoryUnits.assetTagCode, cleanTag), eq(inventoryUnits.rfidTag, cleanTag))
                : eq(inventoryUnits.id, unitId),
        });
        if (!unit) return NextResponse.json({ error: "Asset unit not found" }, { status: 404 });

        await db.transaction(async (tx) => {
            await tx.update(bookingUnitAssignments)
                .set({ status: "packed" })
                .where(and(
                    eq(bookingUnitAssignments.bookingId, bookingId),
                    eq(bookingUnitAssignments.inventoryUnitId, unit.id)
                ));

            await tx.update(inventoryUnits)
                .set({ availabilityStatus: ASSET_STATUS.PACKED, updatedAt: now })
                .where(eq(inventoryUnits.id, unit.id));

            await logAssetLifecycleEvent({
                actorId: user.id,
                unitId: unit.id,
                assetTagCode: unit.assetTagCode,
                fromStatus: unit.availabilityStatus,
                toStatus: ASSET_STATUS.PACKED,
                role: user.role,
                bookingId,
                note: notes || "Packed for transport",
            });
        });

        return NextResponse.json({ success: true, message: `Asset ${unit.assetTagCode} packed.` });
    }

    // ─── ACTION 6: SINGLE RETURN / CHECK-IN ───
    if (action === "return") {
        const cleanTag = assetTag?.trim().toUpperCase();
        const unit = await db.query.inventoryUnits.findFirst({
            where: cleanTag 
                ? or(eq(inventoryUnits.assetTagCode, cleanTag), eq(inventoryUnits.rfidTag, cleanTag))
                : eq(inventoryUnits.id, unitId),
        });
        if (!unit) return NextResponse.json({ error: "Asset unit not found" }, { status: 404 });

        const assignment = await db.query.bookingUnitAssignments.findFirst({
            where: and(
                eq(bookingUnitAssignments.bookingId, bookingId),
                eq(bookingUnitAssignments.inventoryUnitId, unit.id)
            ),
        });

        if (!assignment) {
            return NextResponse.json({ error: "This unit was not assigned to this booking." }, { status: 400 });
        }

        const newCondition = condition || unit.conditionStatus;
        const needsMaintenance = newCondition === "maintenance_required" || newCondition === "poor";

        await db.transaction(async (tx) => {
            // 1. Update assignment to returned
            await tx.update(bookingUnitAssignments)
                .set({ status: "returned", scannedInAt: now })
                .where(eq(bookingUnitAssignments.id, assignment.id));

            // 2. Put unit into awaiting_inspection (or in_maintenance if immediately flagged)
            const targetStatus = needsMaintenance ? ASSET_STATUS.IN_MAINTENANCE : ASSET_STATUS.AWAITING_INSPECTION;

            await tx.update(inventoryUnits)
                .set({
                    availabilityStatus: targetStatus,
                    conditionStatus: newCondition,
                    lastInspectionDate: now,
                    updatedAt: now,
                })
                .where(eq(inventoryUnits.id, unit.id));

            const logId = uuid();
            await tx.insert(inspectionLogs).values({
                id: logId,
                unitId: unit.id,
                inspectorId: user.id,
                inspectionType: "return",
                conditionBefore: unit.conditionStatus,
                conditionAfter: newCondition,
                notes: notes || `Returned from booking ${bookingId}`,
                createdAt: now,
            });

            await logAssetLifecycleEvent({
                actorId: user.id,
                unitId: unit.id,
                assetTagCode: unit.assetTagCode,
                fromStatus: unit.availabilityStatus,
                toStatus: targetStatus,
                role: user.role,
                bookingId,
                note: `Return dock check-in: condition ${newCondition}`,
            });
        });

        if (needsMaintenance || ["damaged", "poor", "needs_repair"].includes(newCondition)) {
            await createWorkOrderAndClaimFromReturn({
                unitId: unit.id,
                bookingId,
                conditionAfter: newCondition,
                reportedIssue: notes || `Returned from booking ${bookingId} in ${newCondition} condition`,
                actorId: user.id,
                actorName: user.name || "Warehouse Technician",
            });
        }

        return NextResponse.json({ 
            success: true, 
            message: `Asset ${unit.assetTagCode} checked in. Placed in: awaiting inspection.` 
        });
    }

    return NextResponse.json({ error: "Unrecognized fulfillment action" }, { status: 400 });
}
