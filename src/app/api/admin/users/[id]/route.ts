import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { db } from "@/lib/db";
import { users, userSessions } from "@/lib/db/schema";
import { eq, and, sql } from "drizzle-orm";
import { hasPermission, validateUserMutationGuardrails } from "@/lib/permissions";
import { logAuditEvent } from "@/lib/audit";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { user, error } = await requireAuth();
        if (error || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        if (!hasPermission(user.role, "manage_users")) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

        const { id } = await params;
        const [target] = await db.select().from(users).where(eq(users.id, id)).limit(1);
        if (!target) return NextResponse.json({ error: "User not found" }, { status: 404 });

        return NextResponse.json({
            user: {
                id: target.id,
                name: target.name,
                email: target.email,
                role: target.role,
                status: target.status,
                companyName: target.companyName,
                vendorId: target.vendorId,
                lastActive: target.lastActive,
                createdAt: target.createdAt,
            }
        });
    } catch (err: any) {
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { user, error } = await requireAuth();
        if (error || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        if (!hasPermission(user.role, "manage_users")) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

        const { id } = await params;
        const body = await req.json();
        const { role, status, name, companyName, password } = body;

        const [target] = await db.select().from(users).where(eq(users.id, id)).limit(1);
        if (!target) return NextResponse.json({ error: "User not found" }, { status: 404 });

        // Count active super-admins
        const [superAdminCountRes] = await db.select({ count: sql<number>`count(*)::int` })
            .from(users)
            .where(and(eq(users.role, "super_admin"), eq(users.status, "active")));
        const activeSuperAdminCount = superAdminCountRes?.count || 1;

        const guard = validateUserMutationGuardrails(
            user,
            target,
            { role, status },
            activeSuperAdminCount
        );

        if (!guard.allowed) {
            return NextResponse.json({ error: guard.reason }, { status: 403 });
        }

        const updateData: any = { updatedAt: new Date() };
        if (role) updateData.role = role;
        if (status) updateData.status = status;
        if (name) updateData.name = name;
        if (companyName !== undefined) updateData.companyName = companyName;
        if (password) updateData.password = password;

        await db.update(users).set(updateData).where(eq(users.id, id));

        // If status is suspended or password changed, revoke active sessions
        if (status === "suspended" || status === "blocked" || password) {
            await db.update(userSessions).set({
                isRevoked: true,
                revokedAt: new Date()
            }).where(eq(userSessions.userId, id));
        }

        await logAuditEvent({
            actorId: user.id,
            actorEmail: user.email,
            actorRole: user.role,
            action: status === "suspended" ? "user.suspended" : "user.updated",
            objectType: "user",
            objectId: id,
            beforeState: { role: target.role, status: target.status, name: target.name },
            afterState: { role: updateData.role || target.role, status: updateData.status || target.status, name: updateData.name || target.name },
            severity: status === "suspended" ? "warning" : "info",
        });

        return NextResponse.json({ success: true, message: "User updated successfully" });
    } catch (err: any) {
        return NextResponse.json({ error: err.message || "Internal server error" }, { status: 500 });
    }
}
