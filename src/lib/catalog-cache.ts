/**
 * catalog-cache.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Simple in-process key/value store with per-entry TTL.
 *
 * ⚠️  This is intentionally NOT a distributed cache. In a serverless/Vercel
 * environment each function instance has its own memory. The cron job writes
 * to every cold-start instance progressively (within seconds of first traffic).
 * For true multi-instance consistency, swap this with Redis/Upstash — the
 * public API surface is identical.
 */

interface CacheEntry<T> {
    data: T;
    expiresAt: number;
}

// Module-level map — persists across requests within the same Node.js process.
const store = new Map<string, CacheEntry<unknown>>();

/**
 * Read a cache entry. Returns `null` if missing or expired.
 */
export function getCache<T>(key: string): T | null {
    const entry = store.get(key) as CacheEntry<T> | undefined;
    if (!entry) return null;
    if (Date.now() > entry.expiresAt) {
        store.delete(key);
        return null;
    }
    return entry.data;
}

/**
 * Write a cache entry with a TTL in milliseconds.
 */
export function setCache<T>(key: string, data: T, ttlMs: number): void {
    store.set(key, { data, expiresAt: Date.now() + ttlMs });
}

/**
 * Delete all entries whose key starts with `prefix`.
 * Useful for invalidating a category of cached results (e.g. after an admin
 * updates a product).
 */
export function bustCache(prefix: string): void {
    for (const key of store.keys()) {
        if (key.startsWith(prefix)) store.delete(key);
    }
}

/** Convenience TTL constants */
export const TTL = {
    /** 5 minutes — used for availability snapshots */
    AVAILABILITY: 5 * 60 * 1000,
    /** 6 minutes — cron writes; products API reads */
    FACETS: 6 * 60 * 1000,
    /** 30 seconds — paginated product list pages */
    PRODUCT_PAGE: 30 * 1000,
};

/** Cache keys */
export const CACHE_KEYS = {
    AVAILABILITY_MAP: "availability_map",
    FACETS: "catalog_facets",
    productPage: (category: string, search: string, cursor: string) =>
        `product_page::${category}::${search}::${cursor}`,
};
