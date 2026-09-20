import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { db } from "@/lib/db";
import { systemLogs, users } from "@/lib/db/schema";
import { eq, desc, sql } from "drizzle-orm";
import { hasPermission } from "@/lib/permissions";

export async function GET(req: Request) {
    try {
        const { user, error } = await requireAuth();
        if (error || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        if (!hasPermission(user.role, "view_audit_logs")) {
            return NextResponse.json({ error: "Forbidden: Super-Admin or Admin authority required" }, { status: 403 });
        }

        const url = new URL(req.url);
        const page = parseInt(url.searchParams.get("page") || "1", 10);
        const limit = Math.min(parseInt(url.searchParams.get("limit") || "100", 10), 200);
        const offset = (page - 1) * limit;

        const rawLogs = await db
            .select({
                id: systemLogs.id,
                action: systemLogs.action,
                targetId: systemLogs.targetId,
                targetType: systemLogs.targetType,
                details: systemLogs.details,
                createdAt: systemLogs.createdAt,
                adminId: systemLogs.adminId,
                adminName: users.name,
                adminEmail: users.email,
            })
            .from(systemLogs)
            .leftJoin(users, eq(systemLogs.adminId, users.id))
            .orderBy(desc(systemLogs.createdAt))
            .limit(limit)
            .offset(offset);

        const [totalRes] = await db.select({ count: sql<number>`count(*)::int` }).from(systemLogs);

        const formattedLogs = rawLogs.map(l => ({
            id: l.id,
            action: l.action || "system_event",
            targetId: l.targetId || "N/A",
            targetType: l.targetType || "system",
            details: l.details || "",
            createdAt: l.createdAt ? new Date(l.createdAt).toISOString() : new Date().toISOString(),
            adminName: l.adminName || "Platform System",
            adminEmail: l.adminEmail || "admin@e3rentals.com",
        }));

        return NextResponse.json({
            logs: formattedLogs,
            total: totalRes?.count || formattedLogs.length,
            page,
            limit,
        });
    } catch (err: any) {
        console.error("GET /api/super-admin/logs error:", err);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
