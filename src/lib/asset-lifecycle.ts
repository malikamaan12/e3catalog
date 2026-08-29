/**
 * E3 Rentals — Serialized Asset Lifecycle Management & Operational Rules
 * 
 * Enforces valid operational transitions across warehouse picking, staging,
 * transport dispatch, return dock intake, inspection, and maintenance.
 */

import { ASSET_STATUS, USER_ROLES, AssetStatus } from "./constants";
import { db } from "./db";
import { systemLogs, inventoryUnits } from "./db/schema";
import { eq } from "drizzle-orm";
import { v4 as uuid } from "uuid";

export const ALLOWED_ASSET_TRANSITIONS: Record<string, string[]> = {
    [ASSET_STATUS.ONBOARDING]: [
        ASSET_STATUS.IN_WAREHOUSE,
        ASSET_STATUS.IN_MAINTENANCE,
        ASSET_STATUS.RETIRED,
    ],
    [ASSET_STATUS.IN_WAREHOUSE]: [
        ASSET_STATUS.RESERVED,
        ASSET_STATUS.ALLOCATED,
        ASSET_STATUS.PICKING,
        ASSET_STATUS.IN_MAINTENANCE,
        ASSET_STATUS.RETIRED,
    ],
    [ASSET_STATUS.RESERVED]: [
        ASSET_STATUS.ALLOCATED,
        ASSET_STATUS.IN_WAREHOUSE,
        ASSET_STATUS.IN_MAINTENANCE,
    ],
    [ASSET_STATUS.ALLOCATED]: [
        ASSET_STATUS.PICKING,
        ASSET_STATUS.STAGED,
        ASSET_STATUS.RESERVED,
        ASSET_STATUS.IN_WAREHOUSE,
    ],
    [ASSET_STATUS.PICKING]: [
        ASSET_STATUS.STAGED,
        ASSET_STATUS.ALLOCATED,
        ASSET_STATUS.IN_WAREHOUSE,
    ],
    [ASSET_STATUS.STAGED]: [
        ASSET_STATUS.PACKED,
        ASSET_STATUS.PICKING,
        ASSET_STATUS.IN_WAREHOUSE,
    ],
    [ASSET_STATUS.PACKED]: [
        ASSET_STATUS.LOADED,
        ASSET_STATUS.DISPATCHED,
        ASSET_STATUS.STAGED,
        ASSET_STATUS.IN_WAREHOUSE,
    ],
    [ASSET_STATUS.LOADED]: [
        ASSET_STATUS.DISPATCHED,
        ASSET_STATUS.PACKED,
    ],
    [ASSET_STATUS.DISPATCHED]: [
        ASSET_STATUS.ON_RENT,
        ASSET_STATUS.RETURNED,
        ASSET_STATUS.MISSING_LOST,
    ],
    [ASSET_STATUS.ON_RENT]: [
        ASSET_STATUS.RETURN_DUE,
        ASSET_STATUS.RETURNED,
        ASSET_STATUS.MISSING_LOST,
        ASSET_STATUS.DAMAGED_HOLD,
    ],
    [ASSET_STATUS.RETURN_DUE]: [
        ASSET_STATUS.RETURNED,
        ASSET_STATUS.MISSING_LOST,
    ],
    [ASSET_STATUS.RETURNED]: [
        ASSET_STATUS.AWAITING_INSPECTION,
    ],
    [ASSET_STATUS.AWAITING_INSPECTION]: [
        ASSET_STATUS.IN_WAREHOUSE,
        ASSET_STATUS.IN_MAINTENANCE,
        ASSET_STATUS.DAMAGED_HOLD,
        ASSET_STATUS.RETIRED,
    ],
    [ASSET_STATUS.IN_MAINTENANCE]: [
        ASSET_STATUS.AWAITING_INSPECTION,
        ASSET_STATUS.IN_WAREHOUSE,
        ASSET_STATUS.RETIRED,
    ],
    [ASSET_STATUS.DAMAGED_HOLD]: [
        ASSET_STATUS.IN_MAINTENANCE,
        ASSET_STATUS.RETIRED,
        ASSET_STATUS.AWAITING_INSPECTION,
    ],
    [ASSET_STATUS.MISSING_LOST]: [
        ASSET_STATUS.RETURNED,
        ASSET_STATUS.RETIRED,
    ],
    [ASSET_STATUS.RETIRED]: [
        ASSET_STATUS.IN_WAREHOUSE, // Authorized reactivation
    ],
};

/**
 * Validates whether a state transition from `fromStatus` to `toStatus` is permissible.
 */
export function isValidAssetTransition(fromStatus: string, toStatus: string): boolean {
    if (fromStatus === toStatus) return true;
    const allowed = ALLOWED_ASSET_TRANSITIONS[fromStatus];
    if (!allowed) return false;
    return allowed.includes(toStatus);
}

/**
 * Checks if a specific user role has permission to execute an asset lifecycle transition.
 */
export function canRoleTransitionAsset(
    role: string,
    fromStatus: string,
    toStatus: string,
    isOverride: boolean = false
): boolean {
    // Super admin can execute all transitions and overrides
    if (role === USER_ROLES.SUPER_ADMIN || role === USER_ROLES.ADMIN) {
        return true;
    }

    // Warehouse Managers have full operational control over picking, staging, packing, dispatch, return, and inspection
    if (role === USER_ROLES.WAREHOUSE_MANAGER) {
        if (toStatus === ASSET_STATUS.RETIRED && !isOverride) {
            return false; // Retiring equipment requires admin confirmation
        }
        return true;
    }

    // Vendors can manage their own fleet maintenance and view status
    if (role === USER_ROLES.VENDOR) {
        if ([ASSET_STATUS.IN_MAINTENANCE, ASSET_STATUS.IN_WAREHOUSE].includes(toStatus as any)) {
            return true;
        }
        return false;
    }

    return false;
}

/**
 * Records an asset lifecycle audit event into `system_logs`.
 */
export async function logAssetLifecycleEvent(params: {
    actorId: string;
    unitId: string;
    assetTagCode?: string;
    fromStatus: string;
    toStatus: string;
    role: string;
    bookingId?: string;
    note?: string;
    ipAddress?: string;
}) {
    try {
        await db.insert(systemLogs).values({
            id: uuid(),
            adminId: params.actorId,
            action: `ASSET_LIFECYCLE:${params.fromStatus}->${params.toStatus}`,
            targetId: params.unitId,
            targetType: "inventory_unit",
            details: JSON.stringify({
                assetTagCode: params.assetTagCode || null,
                fromStatus: params.fromStatus,
                toStatus: params.toStatus,
                role: params.role,
                bookingId: params.bookingId || null,
                note: params.note || null,
            }),
            ipAddress: params.ipAddress || null,
            createdAt: new Date(),
        });
    } catch (e) {
        console.error("[ASSET_LIFECYCLE] Failed to write audit log:", e);
    }
}
