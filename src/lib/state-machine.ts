/**
 * E3 Rentals — Authoritative Booking & Quote State Machine
 * 
 * Enforces valid operational state transitions, role-based transition permissions,
 * and structured audit logging across the entire rental lifecycle.
 */

import { BOOKING_STATUS, USER_ROLES } from "./constants";
import { db } from "./db";
import { systemLogs } from "./db/schema";
import { v4 as uuid } from "uuid";

export const ALLOWED_STATUS_TRANSITIONS: Record<string, string[]> = {
    [BOOKING_STATUS.REQUEST]: [
        BOOKING_STATUS.QUOTE_SENT,
        BOOKING_STATUS.CHANGES_REQUESTED,
        BOOKING_STATUS.APPROVED,
        BOOKING_STATUS.CANCELLED,
    ],
    [BOOKING_STATUS.PENDING_QUOTE]: [
        BOOKING_STATUS.QUOTE_SENT,
        BOOKING_STATUS.CHANGES_REQUESTED,
        BOOKING_STATUS.APPROVED,
        BOOKING_STATUS.CANCELLED,
    ],
    [BOOKING_STATUS.CHANGES_REQUESTED]: [
        BOOKING_STATUS.QUOTE_SENT,
        BOOKING_STATUS.APPROVED,
        BOOKING_STATUS.CANCELLED,
    ],
    [BOOKING_STATUS.QUOTE_SENT]: [
        BOOKING_STATUS.QUOTE_ACCEPTED,
        BOOKING_STATUS.APPROVED,
        BOOKING_STATUS.CHANGES_REQUESTED,
        BOOKING_STATUS.CANCELLED,
        "expired",
    ],
    [BOOKING_STATUS.QUOTE_ACCEPTED]: [
        BOOKING_STATUS.APPROVED,
        BOOKING_STATUS.BOOKED,
        BOOKING_STATUS.CANCELLED,
    ],
    [BOOKING_STATUS.APPROVED]: [
        BOOKING_STATUS.BOOKED,
        "packing",
        BOOKING_STATUS.CANCELLED,
    ],
    [BOOKING_STATUS.BOOKED]: [
        "packing",
        BOOKING_STATUS.CANCELLED,
    ],
    "packing": [
        "packed",
        "out_for_delivery",
        BOOKING_STATUS.CANCELLED,
    ],
    "packed": [
        "out_for_delivery",
        "delivered",
    ],
    "out_for_delivery": [
        "delivered",
        BOOKING_STATUS.UNDELIVERED,
    ],
    "delivered": [
        BOOKING_STATUS.COMPLETED,
        BOOKING_STATUS.UNDELIVERED,
    ],
    [BOOKING_STATUS.COMPLETED]: [],
    [BOOKING_STATUS.CANCELLED]: [],
    "expired": [
        BOOKING_STATUS.REQUEST,
    ],
};

/**
 * Validates whether a state transition from `fromStatus` to `toStatus` is permissible.
 */
export function isValidStatusTransition(fromStatus: string, toStatus: string): boolean {
    if (fromStatus === toStatus) return true;
    const allowed = ALLOWED_STATUS_TRANSITIONS[fromStatus];
    if (!allowed) return false;
    return allowed.includes(toStatus);
}

/**
 * Checks if a specific user role has permission to execute a transition.
 */
export function canRoleExecuteTransition(
    role: string,
    fromStatus: string,
    toStatus: string
): boolean {
    if ([USER_ROLES.SUPER_ADMIN, USER_ROLES.ADMIN].includes(role as any)) {
        return true;
    }

    if (role === USER_ROLES.SALES_REP) {
        return [
            BOOKING_STATUS.QUOTE_SENT,
            BOOKING_STATUS.CHANGES_REQUESTED,
            BOOKING_STATUS.APPROVED,
            BOOKING_STATUS.BOOKED,
            BOOKING_STATUS.CANCELLED,
        ].includes(toStatus as any);
    }

    if (role === USER_ROLES.CLIENT) {
        if (fromStatus === BOOKING_STATUS.QUOTE_SENT && [BOOKING_STATUS.QUOTE_ACCEPTED, BOOKING_STATUS.APPROVED, BOOKING_STATUS.CHANGES_REQUESTED, BOOKING_STATUS.CANCELLED].includes(toStatus as any)) {
            return true;
        }
        if ([BOOKING_STATUS.REQUEST, BOOKING_STATUS.PENDING_QUOTE].includes(fromStatus as any) && toStatus === BOOKING_STATUS.CANCELLED) {
            return true;
        }
        return false;
    }

    if (role === USER_ROLES.WAREHOUSE_MANAGER) {
        return ["packing", "packed", "out_for_delivery", "delivered", BOOKING_STATUS.COMPLETED, BOOKING_STATUS.UNDELIVERED].includes(toStatus);
    }

    return false;
}

/**
 * Records a state transition audit log into system_logs.
 */
export async function logStatusTransition(params: {
    actorId: string;
    targetId: string;
    fromStatus: string;
    toStatus: string;
    role: string;
    details?: string;
    ipAddress?: string;
}) {
    try {
        await db.insert(systemLogs).values({
            id: uuid(),
            adminId: params.actorId,
            action: `STATUS_TRANSITION:${params.fromStatus}->${params.toStatus}`,
            targetId: params.targetId,
            targetType: "booking",
            details: JSON.stringify({
                fromStatus: params.fromStatus,
                toStatus: params.toStatus,
                role: params.role,
                note: params.details || null,
            }),
            ipAddress: params.ipAddress || null,
            createdAt: new Date(),
        });
    } catch (e) {
        console.error("[STATE_MACHINE] Failed to write audit log:", e);
    }
}
