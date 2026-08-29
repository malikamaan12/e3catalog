import { db } from "@/lib/db";
import { 
    bookings, 
    inventoryUnits, 
    bookingUnitAssignments, 
    products, 
    inspectionLogs,
    systemLogs 
} from "@/lib/db/schema";
import { eq, and, sql } from "drizzle-orm";
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
 * POST /api/admin/fulfillment
 * Warehouse Fulfillment Actions:
 *  - auto_allocate: Deterministic auto-allocation
 *  - manual_allocate: Scan / select asset tag to allocate
 *  - release: Release unit back to warehouse floor
 *  - stage: Mark unit as staged in bay
 *  - pack: Mark unit as packed in flight case / container
 *  - dispatch: Mark unit as dispatched with driver
 *  - return: Check in returned unit (sends to quarantine / awaiting_inspection)
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

    // ─── ACTION 2: MANUAL ALLOCATE BY TAG ───
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
        const targetUnitId = unitId || (assetTag ? (await db.query.inventoryUnits.findFirst({ where: eq(inventoryUnits.assetTagCode, assetTag.trim().toUpperCase()) }))?.id : null);
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

    // ─── ACTION 4: STAGE UNIT (Move to Bay) ───
    if (action === "stage") {
        const cleanTag = assetTag?.trim().toUpperCase();
        const unit = await db.query.inventoryUnits.findFirst({
            where: cleanTag ? eq(inventoryUnits.assetTagCode, cleanTag) : eq(inventoryUnits.id, unitId),
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

    // ─── ACTION 5: PACK UNIT ───
    if (action === "pack") {
        const cleanTag = assetTag?.trim().toUpperCase();
        const unit = await db.query.inventoryUnits.findFirst({
            where: cleanTag ? eq(inventoryUnits.assetTagCode, cleanTag) : eq(inventoryUnits.id, unitId),
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

    // ─── ACTION 6: RETURN / CHECK-IN (Quarantine & Inspection Route) ───
    if (action === "return") {
        const cleanTag = assetTag?.trim().toUpperCase();
        const unit = await db.query.inventoryUnits.findFirst({
            where: cleanTag ? eq(inventoryUnits.assetTagCode, cleanTag) : eq(inventoryUnits.id, unitId),
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

            // 3. Create Inspection record
            await tx.insert(inspectionLogs).values({
                id: uuid(),
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

        return NextResponse.json({ 
            success: true, 
            message: `Asset ${unit.assetTagCode} checked in. Placed in: awaiting inspection.` 
        });
    }

    return NextResponse.json({ error: "Unrecognized fulfillment action" }, { status: 400 });
}
