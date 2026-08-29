import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { sql } from "drizzle-orm";
import { getIntegrationsStatus } from "@/lib/env";
import { notificationOutbox } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export async function GET() {
    const startTime = Date.now();
    const checks: Record<string, any> = {};
    let isReady = true;

    // 1. Database Connectivity & Latency Check
    try {
        const dbStart = Date.now();
        await db.execute(sql`SELECT 1 as ping;`);
        checks.database = {
            status: "healthy",
            latencyMs: Date.now() - dbStart,
        };
    } catch (err: any) {
        isReady = false;
        checks.database = {
            status: "unhealthy",
            error: err.message,
        };
    }

    // 2. Integrations & Providers Status
    const integrations = getIntegrationsStatus();
    checks.integrations = integrations;

    // 3. Queue / Outbox Backlog Check
    try {
        const pending = await db
            .select({ count: sql<number>`count(*)::int` })
            .from(notificationOutbox)
            .where(eq(notificationOutbox.status, "pending"));

        checks.outboxQueue = {
            status: "healthy",
            pendingCount: pending[0]?.count || 0,
        };
    } catch {
        checks.outboxQueue = { status: "unknown" };
    }

    const totalDurationMs = Date.now() - startTime;

    return NextResponse.json(
        {
            status: isReady ? "ready" : "degraded",
            timestamp: new Date().toISOString(),
            version: "0.1.0",
            totalDurationMs,
            checks,
        },
        { status: isReady ? 200 : 503 }
    );
}
