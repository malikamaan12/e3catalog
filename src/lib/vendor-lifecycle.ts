/**
 * E3 Rentals — Centralized Vendor Lifecycle State Machine
 * 
 * Enforces valid operational transitions across vendor onboarding, compliance KYC,
 * admin reviews, revision requests, activation, suspension, and offboarding.
 */

import { VENDOR_STATUS, USER_ROLES } from "./constants";
import { db } from "./db";
import { systemLogs } from "./db/schema";
import { v4 as uuid } from "uuid";

export const ALLOWED_VENDOR_TRANSITIONS: Record<string, string[]> = {
    [VENDOR_STATUS.APPLICATION_DRAFT]: [
        VENDOR_STATUS.SUBMITTED,
        VENDOR_STATUS.REJECTED,
    ],
    [VENDOR_STATUS.SUBMITTED]: [
        VENDOR_STATUS.KYC_INCOMPLETE,
        VENDOR_STATUS.UNDER_REVIEW,
        VENDOR_STATUS.REJECTED,
    ],
    [VENDOR_STATUS.KYC_INCOMPLETE]: [
        VENDOR_STATUS.SUBMITTED,
        VENDOR_STATUS.UNDER_REVIEW,
        VENDOR_STATUS.REJECTED,
    ],
    [VENDOR_STATUS.UNDER_REVIEW]: [
        VENDOR_STATUS.CHANGES_REQUESTED,
        VENDOR_STATUS.APPROVED,
        VENDOR_STATUS.REJECTED,
    ],
    [VENDOR_STATUS.CHANGES_REQUESTED]: [
        VENDOR_STATUS.RESUBMITTED,
        VENDOR_STATUS.REJECTED,
    ],
    [VENDOR_STATUS.RESUBMITTED]: [
        VENDOR_STATUS.UNDER_REVIEW,
        VENDOR_STATUS.APPROVED,
        VENDOR_STATUS.CHANGES_REQUESTED,
        VENDOR_STATUS.REJECTED,
    ],
    [VENDOR_STATUS.APPROVED]: [
        VENDOR_STATUS.ACTIVE,
        VENDOR_STATUS.SUSPENDED,
        VENDOR_STATUS.OFFBOARDED,
    ],
    [VENDOR_STATUS.ACTIVE]: [
        VENDOR_STATUS.SUSPENDED,
        VENDOR_STATUS.OFFBOARDED,
    ],
    [VENDOR_STATUS.SUSPENDED]: [
        VENDOR_STATUS.ACTIVE,
        VENDOR_STATUS.OFFBOARDED,
    ],
    [VENDOR_STATUS.REJECTED]: [
        VENDOR_STATUS.APPLICATION_DRAFT,
        VENDOR_STATUS.SUBMITTED,
    ],
    [VENDOR_STATUS.OFFBOARDED]: [],
};

/**
 * Validates whether a state transition from `fromStatus` to `toStatus` is permissible.
 */
export function isValidVendorTransition(fromStatus: string, toStatus: string): boolean {
    if (fromStatus === toStatus) return true;
    const allowed = ALLOWED_VENDOR_TRANSITIONS[fromStatus];
    if (!allowed) return false;
    return allowed.includes(toStatus);
}

/**
 * Validates whether a specific role has authorization to execute the vendor transition.
 */
export function canRoleTransitionVendor(role: string, fromStatus: string, toStatus: string): boolean {
    // Super Admin and Admin have complete oversight
    if (role === USER_ROLES.SUPER_ADMIN || role === USER_ROLES.ADMIN) {
        return true;
    }

    // Vendor applicant or active vendor role
    if (role === USER_ROLES.VENDOR || role === USER_ROLES.CLIENT) {
        // Vendors can only submit drafts or resubmit after change requests
        if (fromStatus === VENDOR_STATUS.APPLICATION_DRAFT && toStatus === VENDOR_STATUS.SUBMITTED) {
            return true;
        }
        if (fromStatus === VENDOR_STATUS.KYC_INCOMPLETE && toStatus === VENDOR_STATUS.SUBMITTED) {
            return true;
        }
        if (fromStatus === VENDOR_STATUS.CHANGES_REQUESTED && toStatus === VENDOR_STATUS.RESUBMITTED) {
            return true;
        }
        // Vendors can NEVER self-approve, reject, suspend, or offboard
        return false;
    }

    return false;
}

/**
 * Records a vendor lifecycle transition event into `system_logs`.
 */
export async function logVendorLifecycleEvent(params: {
    actorId: string;
    vendorId: string;
    companyName?: string;
    fromStatus: string;
    toStatus: string;
    role: string;
    reason?: string;
    ipAddress?: string;
}) {
    try {
        await db.insert(systemLogs).values({
            id: uuid(),
            adminId: params.actorId,
            action: `VENDOR_LIFECYCLE:${params.fromStatus}->${params.toStatus}`,
            targetId: params.vendorId,
            targetType: "vendor",
            details: JSON.stringify({
                companyName: params.companyName || null,
                fromStatus: params.fromStatus,
                toStatus: params.toStatus,
                role: params.role,
                reason: params.reason || null,
            }),
            ipAddress: params.ipAddress || null,
            createdAt: new Date(),
        });
    } catch (e) {
        console.error("[VENDOR_LIFECYCLE] Failed to write audit log:", e);
    }
}
