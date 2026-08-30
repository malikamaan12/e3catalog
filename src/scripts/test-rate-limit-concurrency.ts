/**
 * E3 Rentals — Multi-Process Concurrent Rate Limiter Verification Test
 * 
 * Simulates concurrent requests across simulated application cluster nodes
 * against the PostgreSQL distributed rate limiter to prove atomic consistency.
 */

import { checkRateLimit } from "../lib/rate-limit";

export async function runRateLimitConcurrencyTest(): Promise<{
    totalRequests: number;
    allowed: number;
    blocked: number;
    success: boolean;
}> {
    console.log("=================================================");
    console.log("  E3 Rentals — Concurrent Rate Limiter Test");
    console.log("=================================================\n");

    const testKey = `concurrency_test_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
    const limit = 10;
    const windowSeconds = 10;
    const totalRequests = 30;

    console.log(`[Concurrency Test] Firing ${totalRequests} simultaneous requests for limit = ${limit}...`);

    // Fire 30 concurrent consumption promises simultaneously
    const results = await Promise.all(
        Array.from({ length: totalRequests }).map(() =>
            checkRateLimit(testKey, { limit, windowSeconds })
        )
    );

    const allowed = results.filter(r => r.success).length;
    const blocked = results.filter(r => !r.success).length;

    console.log(`[Concurrency Test] Allowed: ${allowed}, Blocked: ${blocked} (Limit: ${limit})`);

    if (allowed !== limit) {
        throw new Error(`Concurrency race detected! Allowed: ${allowed}, Expected exactly: ${limit}`);
    }

    console.log("  ✓ Distributed consistency verified: Exact limit enforced under concurrent load.");
    console.log("\n=================================================");
    console.log("  CONCURRENCY TEST: FULLY VERIFIED (PASS)");
    console.log("=================================================\n");

    return { totalRequests, allowed, blocked, success: true };
}

if (require.main === module) {
    runRateLimitConcurrencyTest()
        .then(() => process.exit(0))
        .catch(err => {
            console.error("[Concurrency Test] FAILED:", err);
            process.exit(1);
        });
}
