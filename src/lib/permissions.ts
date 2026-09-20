import { USER_ROLES } from "./constants";

export type PermissionKey =
    | "view_margins"
    | "approve_discounts"
    | "verify_payments"
    | "approve_refunds"
    | "approve_vendor_payouts"
    | "modify_inventory"
    | "override_lifecycle_state"
    | "review_vendor_kyc"
    | "view_audit_logs"
    | "manage_platform_settings"
    | "export_sensitive_data"
    | "manage_users"
    | "execute_cron_jobs"
    | "view_financial_analytics"
    | "global_search";

// Deny-by-default permission matrix
const ROLE_PERMISSIONS: Record<string, Set<PermissionKey>> = {
    [USER_ROLES.SUPER_ADMIN]: new Set<PermissionKey>([
        "view_margins",
        "approve_discounts",
        "verify_payments",
        "approve_refunds",
        "approve_vendor_payouts",
        "modify_inventory",
        "override_lifecycle_state",
        "review_vendor_kyc",
        "view_audit_logs",
        "manage_platform_settings",
        "export_sensitive_data",
        "manage_users",
        "execute_cron_jobs",
        "view_financial_analytics",
        "global_search",
    ]),
    [USER_ROLES.ADMIN]: new Set<PermissionKey>([
        "view_margins",
        "approve_discounts",
        "verify_payments",
        "approve_refunds",
        "approve_vendor_payouts",
        "modify_inventory",
        "override_lifecycle_state",
        "review_vendor_kyc",
        "view_audit_logs",
        "manage_platform_settings",
        "export_sensitive_data",
        "manage_users",
        "view_financial_analytics",
        "global_search",
    ]),
    [USER_ROLES.SALES_REP]: new Set<PermissionKey>([
        "approve_discounts",
        "global_search",
    ]),
    [USER_ROLES.WAREHOUSE_MANAGER]: new Set<PermissionKey>([
        "modify_inventory",
        "override_lifecycle_state",
        "global_search",
    ]),
    [USER_ROLES.VENDOR]: new Set<PermissionKey>([
        "modify_inventory", // Tenant-scoped inventory only
    ]),
    [USER_ROLES.CLIENT]: new Set<PermissionKey>([
        // Denied all administrative operations
    ]),
};

/**
 * Checks whether a given role holds the requested permission.
 * Strictly adheres to deny-by-default.
 */
export function hasPermission(role: string | undefined | null, permission: PermissionKey): boolean {
    if (!role) return false;
    const permissions = ROLE_PERMISSIONS[role];
    if (!permissions) return false;
    return permissions.has(permission);
}

/**
 * Validates whether an actor role can elevate or assign a target role.
 */
export function canAssignRole(actorRole: string, targetRole: string): boolean {
    if (actorRole === USER_ROLES.SUPER_ADMIN) {
        return true;
    }
    if (actorRole === USER_ROLES.ADMIN) {
        if (targetRole === USER_ROLES.SUPER_ADMIN) {
            return false;
        }
        return true;
    }
    return false;
}

/**
 * Validates user modification guardrails:
 * - User cannot elevate own role.
 * - Admin cannot demote or delete a Super-Admin.
 * - Final active Super-Admin cannot be demoted, suspended, or deleted.
 */
export function validateUserMutationGuardrails(
    actor: { id: string; role: string },
    targetUser: { id: string; role: string; status: string },
    updates: { role?: string; status?: string },
    activeSuperAdminCount: number
): { allowed: boolean; reason?: string } {
    if (actor.id === targetUser.id && updates.role && updates.role !== targetUser.role) {
        return { allowed: false, reason: "Users cannot alter or elevate their own role." };
    }

    if (updates.role === USER_ROLES.SUPER_ADMIN && actor.role !== USER_ROLES.SUPER_ADMIN) {
        return { allowed: false, reason: "Only a Super-Admin can grant Super-Admin privileges." };
    }

    if (targetUser.role === USER_ROLES.SUPER_ADMIN && actor.role !== USER_ROLES.SUPER_ADMIN) {
        return { allowed: false, reason: "Only a Super-Admin can modify another Super-Admin." };
    }

    if (targetUser.role === USER_ROLES.SUPER_ADMIN) {
        const isDemotion = updates.role && updates.role !== USER_ROLES.SUPER_ADMIN;
        const isSuspension = updates.status && updates.status !== "active";

        if ((isDemotion || isSuspension) && activeSuperAdminCount <= 1) {
            return {
                allowed: false,
                reason: "Cannot demote or suspend the final active Super-Admin on the platform."
            };
        }
    }

    return { allowed: true };
}
