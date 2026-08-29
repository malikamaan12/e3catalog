import { db } from "./db";
import { cronJobRuns } from "./db/schema";
import { v4 as uuid } from "uuid";
import { eq, and, gt, sql } from "drizzle-orm";
import * as crypto from "crypto";

export interface CronExecutionResult {
    jobName: string;
    itemsProcessed: number;
    itemsFailed: number;
    details?: any;
    error?: string;
}

/**
 * Timing-safe secret verification for Cron and Webhook endpoints.
 */
export function verifyCronSecret(req: Request): boolean {
    const authHeader = req.headers.get("authorization") || "";
    const cronSecret = process.env.CRON_SECRET || "dev-cron-secret-12345";

    let providedToken = "";
    if (authHeader.startsWith("Bearer ")) {
        providedToken = authHeader.substring(7).trim();
    } else {
        const url = new URL(req.url);
        providedToken = url.searchParams.get("secret") || "";
    }

    if (!providedToken) return false;

    try {
        const expectedBuffer = Buffer.from(cronSecret);
        const providedBuffer = Buffer.from(providedToken);
        if (expectedBuffer.length !== providedBuffer.length) {
            return false;
        }
        return crypto.timingSafeEqual(expectedBuffer, providedBuffer);
    } catch {
        return false;
    }
}

/**
 * Executes a cron task with database-backed execution lock and history recording.
 */
export async function withCronExecutionGovernance(
    jobName: string,
    triggerType: "scheduled" | "manual",
    triggeredByUserId: string | undefined,
    executionFn: () => Promise<CronExecutionResult>
): Promise<{ success: boolean; runId: string; result?: CronExecutionResult; message?: string }> {
    const runId = uuid();
    const lockDurationMs = 5 * 60 * 1000; // 5 minutes lock
    const now = new Date();
    const lockExpiry = new Date(now.getTime() + lockDurationMs);

    // 1. Check for active execution lock
    const [activeLock] = await db
        .select()
        .from(cronJobRuns)
        .where(
            and(
                eq(cronJobRuns.jobName, jobName),
                eq(cronJobRuns.status, "running"),
                gt(cronJobRuns.lockExpiresAt, now)
            )
        )
        .limit(1);

    if (activeLock) {
        return {
            success: false,
            runId,
            message: `Job '${jobName}' is currently locked and running by instance ${activeLock.lockedBy}.`,
        };
    }

    // 2. Acquire lock
    await db.insert(cronJobRuns).values({
        id: runId,
        jobName,
        triggerType,
        status: "running",
        startTime: now,
        itemsProcessed: 0,
        itemsFailed: 0,
        lockedBy: runId,
        lockExpiresAt: lockExpiry,
        triggeredBy: triggeredByUserId,
        createdAt: now,
    });

    const startTimeMs = Date.now();

    try {
        const execResult = await executionFn();
        const durationMs = Date.now() - startTimeMs;
        const endTime = new Date();

        await db.update(cronJobRuns).set({
            status: "success",
            endTime,
            durationMs,
            itemsProcessed: execResult.itemsProcessed,
            itemsFailed: execResult.itemsFailed,
            errorDetails: execResult.details,
            lockedBy: null,
            lockExpiresAt: null,
        }).where(eq(cronJobRuns.id, runId));

        return {
            success: true,
            runId,
            result: execResult,
        };
    } catch (err: any) {
        const durationMs = Date.now() - startTimeMs;
        const endTime = new Date();

        await db.update(cronJobRuns).set({
            status: "failed",
            endTime,
            durationMs,
            itemsFailed: 1,
            errorDetails: { message: err.message, stack: err.stack },
            lockedBy: null,
            lockExpiresAt: null,
        }).where(eq(cronJobRuns.id, runId));

        return {
            success: false,
            runId,
            message: err.message,
        };
    }
}
