import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";

import { USER_ROLES } from "./constants";

/**
 * Call this at the top of every admin API handler.
 * Returns { error: NextResponse } when the caller is not an admin,
 * or { user } when the caller is verified as an admin.
 */
export async function requireAdmin(allowedRoles?: string[]): Promise<
    | { user: NonNullable<Awaited<ReturnType<typeof getCurrentUser>>>; error?: never }
    | { error: NextResponse; user?: never }
> {
    const user = await getCurrentUser();
    if (!user) {
        return {
            error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
        };
    }

    // Default allowed roles if none specified
    const roles = allowedRoles || [USER_ROLES.ADMIN, USER_ROLES.SUPER_ADMIN, USER_ROLES.SALES_REP];

    if (!roles.includes(user.role) && user.role !== USER_ROLES.SUPER_ADMIN) {
        return {
            error: NextResponse.json({ error: "Forbidden: Admin access required" }, { status: 403 }),
        };
    }
    return { user };
}
