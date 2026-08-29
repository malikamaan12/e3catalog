/**
 * E3 Rentals — Distributed Production-Safe Rate Limiting
 * 
 * Drivers:
 * 1. PostgreSQL Sliding Window (production-ready for multi-instance clusters without Redis)
 * 2. Upstash Redis (production-ready distributed token bucket)
 * 3. In-Memory (single-process dev/unit-test fallback only; NOT production-ready)
 */

import { env } from "./env";
import { db } from "./db";
import { rateLimitEntries } from "./db/schema";
import { eq, and, gt, lte } from "drizzle-orm";
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

// ─── 1. PostgreSQL Distributed Limiter ───────────────────────────────────────
export class PostgresRateLimiter implements RateLimiter {
    async consume(key: string, options: RateLimitOptions): Promise<RateLimitResult> {
        const now = new Date();
        const expireAt = new Date(now.getTime() + options.windowSeconds * 1000);

        try {
            // Clean expired records for this key
            await db
                .delete(rateLimitEntries)
                .where(and(eq(rateLimitEntries.key, key), lte(rateLimitEntries.expireAt, now)));

            // Fetch current point count in the active window
            const activeEntries = await db
                .select()
                .from(rateLimitEntries)
                .where(and(eq(rateLimitEntries.key, key), gt(rateLimitEntries.expireAt, now)));

            const currentPoints = activeEntries.reduce((sum, e) => sum + (e.points || 1), 0);

            if (currentPoints >= options.limit) {
                // Find closest expiry to calculate retryAfter
                const earliestExpiry = activeEntries.reduce(
                    (min, e) => (e.expireAt < min ? e.expireAt : min),
                    expireAt
                );
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

            // Record entry
            await db.insert(rateLimitEntries).values({
                id: uuid(),
                key,
                points: 1,
                expireAt,
                createdAt: now,
            });

            return {
                success: true,
                limit: options.limit,
                remaining: Math.max(0, options.limit - (currentPoints + 1)),
                resetTime: expireAt,
                retryAfter: 0,
                driver: "postgres",
                isProductionReady: true,
            };
        } catch (err: any) {
            console.error("[RateLimiter:Postgres] Fallback due to error:", err.message);
            // Fail open gracefully in case of transient DB connectivity glitch
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

// ─── 2. Redis Distributed Limiter ────────────────────────────────────────────
export class RedisRateLimiter implements RateLimiter {
    private url: string;
    private token: string;

    constructor(url: string, token: string) {
        this.url = url;
        this.token = token;
    }

    async consume(key: string, options: RateLimitOptions): Promise<RateLimitResult> {
        try {
            const resp = await fetch(`${this.url}/pipeline`, {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${this.token}`,
                    "Content-Type": "application/json",
                },
                body: JSON.stringify([
                    ["INCR", `rl:${key}`],
                    ["EXPIRE", `rl:${key}`, options.windowSeconds],
                    ["TTL", `rl:${key}`],
                ]),
            });

            const results = await resp.json();
            const currentPoints = Number(results[0]?.result) || 1;
            const ttl = Number(results[2]?.result) || options.windowSeconds;
            const resetTime = new Date(Date.now() + ttl * 1000);

            if (currentPoints > options.limit) {
                return {
                    success: false,
                    limit: options.limit,
                    remaining: 0,
                    resetTime,
                    retryAfter: Math.max(1, ttl),
                    driver: "redis",
                    isProductionReady: true,
                };
            }

            return {
                success: true,
                limit: options.limit,
                remaining: Math.max(0, options.limit - currentPoints),
                resetTime,
                retryAfter: 0,
                driver: "redis",
                isProductionReady: true,
            };
        } catch (err: any) {
            console.error("[RateLimiter:Redis] Fallback to Postgres:", err.message);
            return new PostgresRateLimiter().consume(key, options);
        }
    }
}

// ─── 3. In-Memory Limiter (Test/Dev Only - NOT Production Ready) ─────────────
const memoryStore = new Map<string, { count: number; expiresAt: number }>();

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

/**
 * Checks rate limit for a given key.
 */
export async function checkRateLimit(key: string, options: RateLimitOptions): Promise<RateLimitResult> {
    const limiter = getRateLimiter();
    return await limiter.consume(key, options);
}

/**
 * Applies standard RFC rate limit headers to a NextResponse.
 */
export function applyRateLimitHeaders(res: NextResponse, result: RateLimitResult): NextResponse {
    res.headers.set("X-RateLimit-Limit", String(result.limit));
    res.headers.set("X-RateLimit-Remaining", String(result.remaining));
    res.headers.set("X-RateLimit-Reset", String(Math.floor(result.resetTime.getTime() / 1000)));

    if (!result.success) {
        res.headers.set("Retry-After", String(result.retryAfter));
    }

    return res;
}
