import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";

/**
 * Call this at the top of every super-admin API handler.
 * Returns { error: NextResponse } when the caller is not a super-admin,
 * or { user } when the caller is verified as a super-admin.
 */
export async function requireSuperAdmin(): Promise<
    | { user: Awaited<ReturnType<typeof getCurrentUser>>; error?: never }
    | { error: NextResponse; user?: never }
> {
    const user = await getCurrentUser();
    if (!user) {
        return {
            error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
        };
    }
    if (user.role !== "super_admin") {
        return {
            error: NextResponse.json({ error: "Forbidden: Super Admin access required" }, { status: 403 }),
        };
    }
    return { user };
}
