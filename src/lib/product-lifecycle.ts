/**
 * E3 Rentals — Product Lifecycle Management & Validation
 * 
 * Enforces valid catalog lifecycle states, role-based transition controls,
 * and structured audit logs.
 */

import { PRODUCT_STATUS, USER_ROLES, ProductStatus } from "./constants";
import { db } from "./db";
import { systemLogs } from "./db/schema";
import { v4 as uuid } from "uuid";

export const ALLOWED_PRODUCT_TRANSITIONS: Record<string, string[]> = {
    [PRODUCT_STATUS.DRAFT]: [
        PRODUCT_STATUS.PENDING_REVIEW,
        PRODUCT_STATUS.APPROVED,
        PRODUCT_STATUS.PUBLISHED,
        PRODUCT_STATUS.ARCHIVED,
    ],
    [PRODUCT_STATUS.PENDING_REVIEW]: [
        PRODUCT_STATUS.APPROVED,
        PRODUCT_STATUS.CHANGES_REQUESTED,
        PRODUCT_STATUS.PUBLISHED,
        PRODUCT_STATUS.ARCHIVED,
    ],
    [PRODUCT_STATUS.CHANGES_REQUESTED]: [
        PRODUCT_STATUS.PENDING_REVIEW,
        PRODUCT_STATUS.ARCHIVED,
    ],
    [PRODUCT_STATUS.APPROVED]: [
        PRODUCT_STATUS.PUBLISHED,
        PRODUCT_STATUS.UNPUBLISHED,
        PRODUCT_STATUS.ARCHIVED,
    ],
    [PRODUCT_STATUS.PUBLISHED]: [
        PRODUCT_STATUS.UNPUBLISHED,
        PRODUCT_STATUS.ARCHIVED,
    ],
    [PRODUCT_STATUS.UNPUBLISHED]: [
        PRODUCT_STATUS.PUBLISHED,
        PRODUCT_STATUS.ARCHIVED,
    ],
    [PRODUCT_STATUS.ARCHIVED]: [
        PRODUCT_STATUS.DRAFT,
    ],
};

/**
 * Validates whether a state transition from `fromStatus` to `toStatus` is permissible.
 */
export function isValidProductTransition(fromStatus: string, toStatus: string): boolean {
    if (fromStatus === toStatus) return true;
    const allowed = ALLOWED_PRODUCT_TRANSITIONS[fromStatus];
    if (!allowed) return false;
    return allowed.includes(toStatus);
}

/**
 * Checks if a specific user role has permission to execute a product lifecycle transition.
 */
export function canRoleTransitionProduct(
    role: string,
    fromStatus: string,
    toStatus: string
): boolean {
    if ([USER_ROLES.SUPER_ADMIN, USER_ROLES.ADMIN].includes(role as any)) {
        return true;
    }

    if (role === USER_ROLES.VENDOR) {
        // Vendors can submit drafts or revisions for review, or archive their drafts
        if ([PRODUCT_STATUS.DRAFT, PRODUCT_STATUS.CHANGES_REQUESTED].includes(fromStatus as any) && toStatus === PRODUCT_STATUS.PENDING_REVIEW) {
            return true;
        }
        if (fromStatus === PRODUCT_STATUS.DRAFT && toStatus === PRODUCT_STATUS.ARCHIVED) {
            return true;
        }
        if (fromStatus === PRODUCT_STATUS.PUBLISHED && toStatus === PRODUCT_STATUS.UNPUBLISHED) {
            return true; // Vendors can pause their listing
        }
        return false;
    }

    return false;
}

/**
 * Records a product lifecycle audit log.
 */
export async function logProductLifecycleEvent(params: {
    actorId: string;
    productId: string;
    fromStatus: string;
    toStatus: string;
    role: string;
    note?: string;
    ipAddress?: string;
}) {
    try {
        await db.insert(systemLogs).values({
            id: uuid(),
            adminId: params.actorId,
            action: `PRODUCT_LIFECYCLE:${params.fromStatus}->${params.toStatus}`,
            targetId: params.productId,
            targetType: "product",
            details: JSON.stringify({
                fromStatus: params.fromStatus,
                toStatus: params.toStatus,
                role: params.role,
                note: params.note || null,
            }),
            ipAddress: params.ipAddress || null,
            createdAt: new Date(),
        });
    } catch (e) {
        console.error("[PRODUCT_LIFECYCLE] Failed to write audit log:", e);
    }
}
