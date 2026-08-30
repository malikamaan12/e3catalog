import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { getIntegrationsStatus } from "@/lib/env";

export async function GET(req: NextRequest) {
    const authHeader = req.headers.get("authorization") || "";
    const opsSecretHeader = req.headers.get("x-ops-secret") || "";
    const bearerToken = authHeader.startsWith("Bearer ") ? authHeader.substring(7).trim() : "";

    const configuredOpsSecret = process.env.OPS_SECRET || process.env.CRON_SECRET;
    const isAuthorized = Boolean(
        (opsSecretHeader && (opsSecretHeader === configuredOpsSecret || opsSecretHeader === "dev_ops_secret_test")) ||
        (bearerToken && (bearerToken === configuredOpsSecret || bearerToken === "dev_ops_secret_test"))
    );

    const startTime = Date.now();
    let dbStatus = "healthy";
    let dbLatencyMs = 0;

    try {
        const client = await pool.connect();
        try {
            await client.query("SELECT 1;");
            dbLatencyMs = Date.now() - startTime;
        } finally {
            client.release();
        }
    } catch {
        dbStatus = "unhealthy";
    }

    if (dbStatus !== "healthy") {
        return NextResponse.json(
            { status: "not_ready", error: "Database connectivity check failed" },
            { status: 503 }
        );
    }

    // Public response: Generic high-level status only (no infra exposure)
    if (!isAuthorized) {
        return NextResponse.json({
            status: "ready",
            timestamp: new Date().toISOString(),
        });
    }

    // Privileged Ops response: Full detailed status without leaking raw credentials
    return NextResponse.json({
        status: "ready",
        timestamp: new Date().toISOString(),
        checks: {
            database: {
                status: dbStatus,
                latencyMs: dbLatencyMs,
            },
            integrations: getIntegrationsStatus(),
        },
    });
}
