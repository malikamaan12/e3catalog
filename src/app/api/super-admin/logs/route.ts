import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { db } from "@/lib/db";
import { auditLogs } from "@/lib/db/schema";
import { eq, and, desc, sql, gte, lte } from "drizzle-orm";
import { hasPermission } from "@/lib/permissions";

export async function GET(req: Request) {
    try {
        const { user, error } = await requireAuth();
        if (error || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        if (!hasPermission(user.role, "view_audit_logs")) {
            return NextResponse.json({ error: "Forbidden: Super-Admin authority required" }, { status: 403 });
        }

        const url = new URL(req.url);
        const action = url.searchParams.get("action");
        const severity = url.searchParams.get("severity");
        const objectType = url.searchParams.get("objectType");
        const actorId = url.searchParams.get("actorId");
        const page = parseInt(url.searchParams.get("page") || "1", 10);
        const limit = Math.min(parseInt(url.searchParams.get("limit") || "50", 10), 100);
        const offset = (page - 1) * limit;

        const conditions: any[] = [];
        if (action) conditions.push(eq(auditLogs.action, action));
        if (severity) conditions.push(eq(auditLogs.severity, severity));
        if (objectType) conditions.push(eq(auditLogs.objectType, objectType));
        if (actorId) conditions.push(eq(auditLogs.actorId, actorId));

        const logs = await db.select()
            .from(auditLogs)
            .where(conditions.length > 0 ? and(...conditions) : undefined)
            .orderBy(desc(auditLogs.createdAt))
            .limit(limit)
            .offset(offset);

        const [totalRes] = await db.select({ count: sql<number>`count(*)::int` })
            .from(auditLogs)
            .where(conditions.length > 0 ? and(...conditions) : undefined);

        return NextResponse.json({
            logs,
            total: totalRes?.count || 0,
            page,
            limit,
        });
    } catch (err: any) {
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
