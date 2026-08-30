/**
 * E3 Rentals — Distributed Production-Safe Rate Limiting
 * 
 * Drivers:
 * 1. PostgreSQL Sliding Window with Atomic Advisory Locks (production-ready multi-instance concurrency safe)
 * 2. Upstash Redis (production-ready distributed token bucket)
 * 3. In-Memory (single-process dev/unit-test fallback only; NOT production-ready)
 */

import { env } from "./env";
import { pool } from "./db";
import { v4 as uuid } from "uuid";
import { NextResponse } from "next/server";

export interface RateLimitOptions {
    limit: number;
    windowSeconds: number;
}

export interface RateLimitResult {
    success: boolean;
    limit: number;
    remaining: number;
    resetTime: Date;
    retryAfter: number; // in seconds
    driver: "postgres" | "redis" | "in-memory";
    isProductionReady: boolean;
}

export interface RateLimiter {
    consume(key: string, options: RateLimitOptions): Promise<RateLimitResult>;
}

// ─── 1. PostgreSQL Distributed Limiter (Atomic CTE with Advisory Lock) ────────
export class PostgresRateLimiter implements RateLimiter {
    async consume(key: string, options: RateLimitOptions): Promise<RateLimitResult> {
        const now = new Date();
        const expireAt = new Date(now.getTime() + options.windowSeconds * 1000);
        const newId = uuid();

        try {
            const queryText = `
                WITH lock AS (
                    SELECT pg_advisory_xact_lock(hashtext($1)) as acquired
                ),
                deleted AS (
                    DELETE FROM rate_limit_entries 
                    WHERE key = $1 AND expire_at <= $2
                    AND (SELECT acquired IS NOT NULL FROM lock)
                ),
                active_points AS (
                    SELECT COALESCE(SUM(points), 0)::int as current_points,
                           MIN(expire_at) as earliest_expiry
                    FROM rate_limit_entries
                    WHERE key = $1 AND expire_at > $2
                    AND (SELECT acquired IS NOT NULL FROM lock)
                ),
                inserted AS (
                    INSERT INTO rate_limit_entries (id, key, points, expire_at, created_at)
                    SELECT $3, $1, 1, $4, $2
                    WHERE (SELECT current_points FROM active_points) < $5
                    AND (SELECT acquired IS NOT NULL FROM lock)
                    RETURNING id
                )
                SELECT 
                    (SELECT current_points FROM active_points) as initial_points,
                    (SELECT earliest_expiry FROM active_points) as earliest_expiry,
                    (SELECT count(*)::int FROM inserted) as inserted_count;
            `;

            const res = await pool.query(queryText, [key, now, newId, expireAt, options.limit]);
            const row = res.rows[0];
            const initialPoints = row ? Number(row.initial_points || 0) : 0;
            const insertedCount = row ? Number(row.inserted_count || 0) : 0;
            const earliestExpiry = row?.earliest_expiry ? new Date(row.earliest_expiry) : expireAt;

            if (insertedCount === 0) {
                const retryAfter = Math.max(1, Math.ceil((earliestExpiry.getTime() - now.getTime()) / 1000));
                return {
                    success: false,
                    limit: options.limit,
                    remaining: 0,
                    resetTime: earliestExpiry,
                    retryAfter,
                    driver: "postgres",
                    isProductionReady: true,
                };
            }

            const currentPoints = initialPoints + 1;
            return {
                success: true,
                limit: options.limit,
                remaining: Math.max(0, options.limit - currentPoints),
                resetTime: expireAt,
                retryAfter: 0,
                driver: "postgres",
                isProductionReady: true,
            };
        } catch (err) {
            console.error("[RateLimiter:Postgres] Error during atomic consume:", err);
            return {
                success: true,
                limit: options.limit,
                remaining: 1,
                resetTime: expireAt,
                retryAfter: 0,
                driver: "postgres",
                isProductionReady: true,
            };
        }
    }
}

// ─── 2. Upstash Redis Distributed Limiter ─────────────────────────────────────
export class RedisRateLimiter implements RateLimiter {
    private restUrl: string;
    private restToken: string;

    constructor(restUrl: string, restToken: string) {
        this.restUrl = restUrl;
        this.restToken = restToken;
    }

    async consume(key: string, options: RateLimitOptions): Promise<RateLimitResult> {
        const now = new Date();

        try {
            const redisKey = `rl:${key}`;
            const pipelineUrl = `${this.restUrl}/pipeline`;
            const res = await fetch(pipelineUrl, {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${this.restToken}`,
                    "Content-Type": "application/json",
                },
                body: JSON.stringify([
                    ["INCR", redisKey],
                    ["EXPIRE", redisKey, options.windowSeconds, "NX"],
                    ["TTL", redisKey],
                ]),
            });

            if (!res.ok) {
                throw new Error(`Upstash Redis HTTP error: ${res.status}`);
            }

            const data = await res.json();
            const currentPoints = typeof data[0]?.result === "number" ? data[0].result : 1;
            const ttlSeconds = typeof data[2]?.result === "number" && data[2].result > 0 ? data[2].result : options.windowSeconds;
            const dynamicReset = new Date(now.getTime() + ttlSeconds * 1000);

            if (currentPoints > options.limit) {
                return {
                    success: false,
                    limit: options.limit,
                    remaining: 0,
                    resetTime: dynamicReset,
                    retryAfter: ttlSeconds,
                    driver: "redis",
                    isProductionReady: true,
                };
            }

            return {
                success: true,
                limit: options.limit,
                remaining: Math.max(0, options.limit - currentPoints),
                resetTime: dynamicReset,
                retryAfter: 0,
                driver: "redis",
                isProductionReady: true,
            };
        } catch (err) {
            console.error("[RateLimiter:Redis] Upstash error, falling back to postgres:", err);
            const fallback = new PostgresRateLimiter();
            return await fallback.consume(key, options);
        }
    }
}

// ─── 3. In-Memory Local Limiter (Dev & Test Only) ─────────────────────────────
interface MemoryEntry {
    count: number;
    expiresAt: number;
}
const memoryStore = new Map<string, MemoryEntry>();

export class MemoryRateLimiter implements RateLimiter {
    async consume(key: string, options: RateLimitOptions): Promise<RateLimitResult> {
        const now = Date.now();
        const existing = memoryStore.get(key);

        if (existing && existing.expiresAt > now) {
            if (existing.count >= options.limit) {
                const retryAfter = Math.max(1, Math.ceil((existing.expiresAt - now) / 1000));
                return {
                    success: false,
                    limit: options.limit,
                    remaining: 0,
                    resetTime: new Date(existing.expiresAt),
                    retryAfter,
                    driver: "in-memory",
                    isProductionReady: false,
                };
            }

            existing.count += 1;
            return {
                success: true,
                limit: options.limit,
                remaining: options.limit - existing.count,
                resetTime: new Date(existing.expiresAt),
                retryAfter: 0,
                driver: "in-memory",
                isProductionReady: false,
            };
        }

        const expiresAt = now + options.windowSeconds * 1000;
        memoryStore.set(key, { count: 1, expiresAt });

        return {
            success: true,
            limit: options.limit,
            remaining: options.limit - 1,
            resetTime: new Date(expiresAt),
            retryAfter: 0,
            driver: "in-memory",
            isProductionReady: false,
        };
    }
}

let activeRateLimiter: RateLimiter | null = null;

export function getRateLimiter(): RateLimiter {
    if (activeRateLimiter) return activeRateLimiter;

    if (env.RATE_LIMIT_DRIVER === "redis" && env.UPSTASH_REDIS_REST_URL && env.UPSTASH_REDIS_REST_TOKEN) {
        activeRateLimiter = new RedisRateLimiter(env.UPSTASH_REDIS_REST_URL, env.UPSTASH_REDIS_REST_TOKEN);
    } else if (env.RATE_LIMIT_DRIVER === "in-memory") {
        activeRateLimiter = new MemoryRateLimiter();
    } else {
        // Default: PostgreSQL distributed limiter (multi-instance cluster safe)
        activeRateLimiter = new PostgresRateLimiter();
    }

    return activeRateLimiter;
}

export async function checkRateLimit(key: string, options: RateLimitOptions): Promise<RateLimitResult> {
    const limiter = getRateLimiter();
    return await limiter.consume(key, options);
}

export function applyRateLimitHeaders(res: NextResponse, result: RateLimitResult): NextResponse {
    res.headers.set("X-RateLimit-Limit", String(result.limit));
    res.headers.set("X-RateLimit-Remaining", String(result.remaining));
    res.headers.set("X-RateLimit-Reset", String(Math.floor(result.resetTime.getTime() / 1000)));

    if (!result.success) {
        res.headers.set("Retry-After", String(result.retryAfter));
    }

    return res;
}

/**
 * Extracts client IP securely behind edge proxies (Vercel, Cloudflare, AWS).
 * In production, prioritizes trusted platform headers over spoofable client headers.
 */
export function getClientIp(req: { headers: { get: (name: string) => string | null } }): string {
    const xRealIp = req.headers.get("x-real-ip");
    if (xRealIp) return xRealIp.trim();

    const xVercelForwarded = req.headers.get("x-vercel-forwarded-for");
    if (xVercelForwarded) {
        return xVercelForwarded.split(",")[0].trim();
    }

    const xForwardedFor = req.headers.get("x-forwarded-for");
    if (xForwardedFor) {
        return xForwardedFor.split(",")[0].trim();
    }

    return "127.0.0.1";
}
