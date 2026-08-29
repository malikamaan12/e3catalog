import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { db, pool } from "@/lib/db";
import { cronJobRuns, notificationOutbox } from "@/lib/db/schema";
import { eq, desc, sql } from "drizzle-orm";
import { hasPermission } from "@/lib/permissions";

export async function GET(req: Request) {
    try {
        const { user, error } = await requireAuth();
        if (error || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        if (!hasPermission(user.role, "global_search")) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

        // Test DB connection latency
        const start = Date.now();
        await pool.query("SELECT 1;");
        const dbLatencyMs = Date.now() - start;

        // Cron job health
        const lastCronRuns = await db.select().from(cronJobRuns).orderBy(desc(cronJobRuns.startTime)).limit(5);
        const [failedCronsRes] = await db.select({ count: sql<number>`count(*)::int` }).from(cronJobRuns).where(eq(cronJobRuns.status, "failed"));

        // Outbox health
        const [outboxPendingRes] = await db.select({ count: sql<number>`count(*)::int` }).from(notificationOutbox).where(eq(notificationOutbox.status, "pending"));
        const [outboxFailedRes] = await db.select({ count: sql<number>`count(*)::int` }).from(notificationOutbox).where(eq(notificationOutbox.status, "failed"));

        return NextResponse.json({
            status: "healthy",
            version: "2026.08-sprint7-governance",
            deployment: process.env.VERCEL_ENV || "production",
            database: {
                status: "connected",
                latencyMs: dbLatencyMs,
                appliedMigrations: 5,
            },
            cronGovernance: {
                totalFailed: failedCronsRes?.count || 0,
                recentRuns: lastCronRuns,
            },
            notificationOutbox: {
                pendingCount: outboxPendingRes?.count || 0,
                failedCount: outboxFailedRes?.count || 0,
            },
            timestamp: new Date().toISOString(),
        });
    } catch (err: any) {
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
