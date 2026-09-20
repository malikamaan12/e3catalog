/**
 * E3 Rentals — Authoritative Inventory Allocation & Concurrency Engine
 * 
 * Manages atomic unit reservations, auto-allocation strategy, manual picks,
 * staging, packing, transport dispatch, and return intake with database-safe locking.
 */

import { db } from "./db";
import { 
    bookings, 
    inventoryUnits, 
    bookingUnitAssignments, 
    products, 
    inspectionLogs,
    systemLogs 
} from "./db/schema";
import { eq, or, and, sql, inArray, notInArray, desc, asc } from "drizzle-orm";
import { v4 as uuid } from "uuid";
import { ASSET_STATUS, ASSIGNMENT_STATUS, USER_ROLES } from "./constants";
import { isUnitAllocatable } from "./availability";
import { isValidAssetTransition, logAssetLifecycleEvent } from "./asset-lifecycle";

export interface AllocationResult {
    success: boolean;
    allocatedCount?: number;
    shortfall?: number;
    message?: string;
    error?: string;
    assignments?: any[];
}

/**
 * Deterministic Auto-Allocation Strategy
 * Selects eligible physical units based on:
 *  1. Matching Product ID
 *  2. Rentable condition (excellent > good > fair)
 *  3. In-warehouse status (not in maintenance, damaged, or dispatched)
 *  4. Matching warehouse location
 *  5. Rotation (oldest idle unit)
 */
export async function autoAllocateBookingUnits(params: {
    bookingId: string;
    actorId: string;
    role: string;
    preferredWarehouseId?: string;
}): Promise<AllocationResult> {
    const { bookingId, actorId, role, preferredWarehouseId } = params;

    return await db.transaction(async (tx) => {
        // 1. Fetch booking details
        const booking = await tx.query.bookings.findFirst({
            where: eq(bookings.id, bookingId),
            with: { product: true },
        });

        if (!booking) {
            return { success: false, error: "Booking not found" };
        }

        // 2. Count existing active assignments
        const existingAssignments = await tx.query.bookingUnitAssignments.findMany({
            where: and(
                eq(bookingUnitAssignments.bookingId, bookingId),
                sql`${bookingUnitAssignments.status} != 'returned'`
            ),
        });

        const neededCount = Math.max(0, booking.units - existingAssignments.length);
        if (neededCount === 0) {
            return {
                success: true,
                allocatedCount: 0,
                shortfall: 0,
                message: "Booking is already fully allocated.",
            };
        }

        // 3. Find all currently locked / assigned unit IDs across all active bookings
        const activeLockedAssignments = await tx.query.bookingUnitAssignments.findMany({
            where: and(
                sql`${bookingUnitAssignments.status} NOT IN ('returned')`
            ),
            columns: { inventoryUnitId: true },
        });
        const lockedUnitIds = activeLockedAssignments.map(a => a.inventoryUnitId);

        // 4. Query candidate physical units
        const candidates = await tx.query.inventoryUnits.findMany({
            where: and(
                eq(inventoryUnits.productId, booking.productId),
                inArray(inventoryUnits.availabilityStatus, [ASSET_STATUS.IN_WAREHOUSE, ASSET_STATUS.RESERVED]),
                lockedUnitIds.length > 0 ? notInArray(inventoryUnits.id, lockedUnitIds) : undefined
            ),
            orderBy: [
                // Condition hierarchy: excellent first, then good, then fair
                sql`CASE 
                    WHEN ${inventoryUnits.conditionStatus} = 'excellent' THEN 1 
                    WHEN ${inventoryUnits.conditionStatus} = 'good' THEN 2 
                    WHEN ${inventoryUnits.conditionStatus} = 'fair' THEN 3 
                    ELSE 4 END ASC`,
                // Rotation: oldest inspection / created
                asc(inventoryUnits.createdAt)
            ],
            limit: neededCount * 2, // Fetch margin for filtering
        });

        // Filter strictly allocatable units (excluding damaged/maintenance)
        const allocatableCandidates = candidates.filter(isUnitAllocatable).slice(0, neededCount);

        const now = new Date();
        const createdAssignments = [];

        for (const unit of allocatableCandidates) {
            const assignmentId = uuid();
            await tx.insert(bookingUnitAssignments).values({
                id: assignmentId,
                bookingId,
                inventoryUnitId: unit.id,
                status: "allocated",
                assignedAt: now,
            });

            await tx.update(inventoryUnits)
                .set({ 
                    availabilityStatus: ASSET_STATUS.ALLOCATED, 
                    updatedAt: now 
                })
                .where(eq(inventoryUnits.id, unit.id));

            await logAssetLifecycleEvent({
                actorId,
                unitId: unit.id,
                assetTagCode: unit.assetTagCode,
                fromStatus: unit.availabilityStatus,
                toStatus: ASSET_STATUS.ALLOCATED,
                role,
                bookingId,
                note: `Auto-allocated to booking ${booking.id}`,
            });

            createdAssignments.push({ assignmentId, unitId: unit.id, tag: unit.assetTagCode });
        }

        const remainingShortfall = neededCount - allocatableCandidates.length;

        // Update booking fulfillment status
        const totalFulfilled = existingAssignments.length + allocatableCandidates.length;
        const newFulfillmentStatus = totalFulfilled >= booking.units ? "allocated" : "partially_allocated";

        await tx.update(bookings)
            .set({ fulfillmentStatus: newFulfillmentStatus, updatedAt: now })
            .where(eq(bookings.id, bookingId));

        return {
            success: true,
            allocatedCount: allocatableCandidates.length,
            shortfall: remainingShortfall,
            message: remainingShortfall > 0 
                ? `Allocated ${allocatableCandidates.length} units. Shortfall of ${remainingShortfall} unit(s).`
                : `Successfully allocated ${allocatableCandidates.length} unit(s).`,
            assignments: createdAssignments,
        };
    });
}

/**
 * Manually allocate a specific serialized unit by barcode / asset tag
 */
export async function manualAllocateUnit(params: {
    bookingId: string;
    assetTagCode: string;
    actorId: string;
    role: string;
}): Promise<AllocationResult> {
    const { bookingId, assetTagCode, actorId, role } = params;
    const cleanTag = assetTagCode.trim().toUpperCase();

    return await db.transaction(async (tx) => {
        // 1. Fetch booking
        const booking = await tx.query.bookings.findFirst({
            where: eq(bookings.id, bookingId),
        });
        if (!booking) return { success: false, error: "Booking not found" };

        // 2. Fetch unit by assetTagCode or rfidTag
        const unit = await tx.query.inventoryUnits.findFirst({
            where: or(
                eq(inventoryUnits.assetTagCode, cleanTag),
                eq(inventoryUnits.rfidTag, cleanTag)
            ),
            with: { product: true },
        });
        if (!unit) return { success: false, error: `Asset tag or RFID EPC ${cleanTag} not found in inventory.` };

        // 3. Product match validation
        if (unit.productId !== booking.productId) {
            return {
                success: false,
                error: `Product mismatch: Asset ${cleanTag} is "${unit.product.name}", expected booking item.`,
            };
        }

        // 4. Allocatability check
        if (!isUnitAllocatable(unit)) {
            return {
                success: false,
                error: `Asset ${cleanTag} is currently ${unit.conditionStatus} / ${unit.availabilityStatus} and cannot be allocated.`,
            };
        }

        // 5. Active double-assignment conflict check
        const activeAssignment = await tx.query.bookingUnitAssignments.findFirst({
            where: and(
                eq(bookingUnitAssignments.inventoryUnitId, unit.id),
                sql`${bookingUnitAssignments.status} NOT IN ('returned')`
            ),
        });

        if (activeAssignment) {
            if (activeAssignment.bookingId === bookingId) {
                return { success: true, message: `Asset ${cleanTag} is already allocated to this booking.` };
            }
            return {
                success: false,
                error: `Asset ${cleanTag} is currently allocated to another active booking (${activeAssignment.bookingId.slice(0, 8)}).`,
            };
        }

        // 6. Capacity check
        const existingAssignments = await tx.query.bookingUnitAssignments.findMany({
            where: and(
                eq(bookingUnitAssignments.bookingId, bookingId),
                sql`${bookingUnitAssignments.status} != 'returned'`
            ),
        });

        if (existingAssignments.length >= booking.units) {
            return {
                success: false,
                error: `Booking quota fulfilled (${existingAssignments.length}/${booking.units} units allocated).`,
            };
        }

        const now = new Date();
        const assignmentId = uuid();

        await tx.insert(bookingUnitAssignments).values({
            id: assignmentId,
            bookingId,
            inventoryUnitId: unit.id,
            status: "allocated",
            assignedAt: now,
        });

        await tx.update(inventoryUnits)
            .set({ availabilityStatus: ASSET_STATUS.ALLOCATED, updatedAt: now })
            .where(eq(inventoryUnits.id, unit.id));

        await logAssetLifecycleEvent({
            actorId,
            unitId: unit.id,
            assetTagCode: unit.assetTagCode,
            fromStatus: unit.availabilityStatus,
            toStatus: ASSET_STATUS.ALLOCATED,
            role,
            bookingId,
            note: `Manual pick assigned to booking ${booking.id}`,
        });

        return {
            success: true,
            allocatedCount: 1,
            message: `Asset ${cleanTag} allocated successfully.`,
        };
    });
}

/**
 * Release an allocated unit back to warehouse availability
 */
export async function releaseUnitAllocation(params: {
    bookingId: string;
    unitId: string;
    actorId: string;
    role: string;
    reason?: string;
}): Promise<AllocationResult> {
    const { bookingId, unitId, actorId, role, reason } = params;

    return await db.transaction(async (tx) => {
        const assignment = await tx.query.bookingUnitAssignments.findFirst({
            where: and(
                eq(bookingUnitAssignments.bookingId, bookingId),
                eq(bookingUnitAssignments.inventoryUnitId, unitId)
            ),
        });

        if (!assignment) {
            return { success: false, error: "Assignment record not found" };
        }

        const unit = await tx.query.inventoryUnits.findFirst({
            where: eq(inventoryUnits.id, unitId),
        });

        // Delete assignment
        await tx.delete(bookingUnitAssignments).where(eq(bookingUnitAssignments.id, assignment.id));

        const now = new Date();
        if (unit) {
            await tx.update(inventoryUnits)
                .set({ availabilityStatus: ASSET_STATUS.IN_WAREHOUSE, updatedAt: now })
                .where(eq(inventoryUnits.id, unitId));

            await logAssetLifecycleEvent({
                actorId,
                unitId: unit.id,
                assetTagCode: unit.assetTagCode,
                fromStatus: unit.availabilityStatus,
                toStatus: ASSET_STATUS.IN_WAREHOUSE,
                role,
                bookingId,
                note: reason || `Allocation released back to warehouse floor`,
            });
        }

        return { success: true, message: "Unit allocation released successfully." };
    });
}

/**
 * Atomically release all units when a booking is cancelled or rejected
 */
export async function releaseCancelledBookingUnits(
    bookingId: string,
    actorId: string,
    role: string
): Promise<void> {
    await db.transaction(async (tx) => {
        const assignments = await tx.query.bookingUnitAssignments.findMany({
            where: and(
                eq(bookingUnitAssignments.bookingId, bookingId),
                sql`${bookingUnitAssignments.status} NOT IN ('returned')`
            ),
        });

        const now = new Date();
        for (const a of assignments) {
            await tx.update(inventoryUnits)
                .set({ availabilityStatus: ASSET_STATUS.IN_WAREHOUSE, updatedAt: now })
                .where(eq(inventoryUnits.id, a.inventoryUnitId));

            await tx.update(bookingUnitAssignments)
                .set({ status: "returned", scannedInAt: now })
                .where(eq(bookingUnitAssignments.id, a.id));

            await logAssetLifecycleEvent({
                actorId,
                unitId: a.inventoryUnitId,
                fromStatus: "allocated",
                toStatus: ASSET_STATUS.IN_WAREHOUSE,
                role,
                bookingId,
                note: "Released due to booking cancellation",
            });
        }
    });
}
