import { db } from "@/lib/db";
import { products, categories, vendors, inventoryUnits, bookings, inventoryOverrides } from "@/lib/db/schema";
import { eq, and, inArray, or, isNull, ilike, gt, sql, lte, gte } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import {
    getCache, setCache,
    CACHE_KEYS, TTL,
} from "@/lib/catalog-cache";

const PAGE_LIMIT = 20;

// ─── Availability helpers ──────────────────────────────────────────────────

/**
 * Compute an availability map { productId → availableUnits } for today.
 * First tries the precomputed cache (written by /api/cron/precompute-facets).
 * Falls back to a live DB query on a cold start (no cron yet, or cache miss).
 */
interface AvailabilityResult {
    totalMap: Record<string, number>;
    availabilityMap: Record<string, number>;
}

/**
 * Compute an availability map for today.
 * Handles both full-fleet precomputation and partial cold-start queries.
 */
async function getAvailabilityMap(productIds: string[]): Promise<AvailabilityResult> {
    const cached = getCache<Record<string, number>>(CACHE_KEYS.AVAILABILITY_MAP);
    
    // If we have a warm cache, we still need totalUnits (which isn't in this specific cache key)
    if (cached) {
        const totalMap = await computeTotalsOnly(productIds);
        return { totalMap, availabilityMap: cached };
    }

    // 2. Cold-start: compute just what we need for this page to avoid massive query lag
    return computeAndCacheAvailability(productIds);
}

/**
 * Helper to get just the total counts (no booking math) for a subset.
 */
async function computeTotalsOnly(productIds: string[]): Promise<Record<string, number>> {
    const unitCounts = await db
        .select({
            productId: inventoryUnits.productId,
            total: sql<number>`count(*)`,
        })
        .from(inventoryUnits)
        .where(inArray(inventoryUnits.productId, productIds))
        .groupBy(inventoryUnits.productId);

    const totalMap: Record<string, number> = {};
    for (const row of unitCounts) {
        totalMap[row.productId] = Number(row.total);
    }
    return totalMap;
}

/**
 * Actually query the DB and write to cache.
 */
export async function computeAndCacheAvailability(
    productIds?: string[]
): Promise<AvailabilityResult> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);

    // 1. Count total inventory units
    const unitCounts = await db
        .select({
            productId: inventoryUnits.productId,
            total: sql<number>`count(*)`,
        })
        .from(inventoryUnits)
        .where(productIds && productIds.length > 0
            ? inArray(inventoryUnits.productId, productIds)
            : undefined
        )
        .groupBy(inventoryUnits.productId);

    const totalMap: Record<string, number> = {};
    for (const row of unitCounts) {
        totalMap[row.productId] = Number(row.total);
    }

    // 2. Count booked units
    const activeBookings = await db
        .select({
            productId: bookings.productId,
            units: sql<number>`sum(${bookings.units})`,
        })
        .from(bookings)
        .where(and(
            productIds && productIds.length > 0
                ? inArray(bookings.productId, productIds)
                : undefined,
            inArray(bookings.status, ["approved", "booked"]),
            lte(bookings.startDate, tomorrow),
            gte(bookings.endDate, today),
        ))
        .groupBy(bookings.productId);

    const activeOverrides = await db
        .select({
            productId: inventoryOverrides.productId,
            unitsOffline: sql<number>`sum(${inventoryOverrides.unitsOffline})`,
        })
        .from(inventoryOverrides)
        .where(and(
            productIds && productIds.length > 0
                ? inArray(inventoryOverrides.productId, productIds)
                : undefined,
            lte(inventoryOverrides.startDate, tomorrow),
            gte(inventoryOverrides.endDate, today),
        ))
        .groupBy(inventoryOverrides.productId);

    const bookedMap: Record<string, number> = {};
    for (const b of activeBookings) {
        bookedMap[b.productId] = Number(b.units);
    }
    for (const o of activeOverrides) {
        bookedMap[o.productId] = (bookedMap[o.productId] || 0) + Number(o.unitsOffline);
    }

    const availabilityMap: Record<string, number> = {};
    for (const [productId, total] of Object.entries(totalMap)) {
        availabilityMap[productId] = Math.max(0, total - (bookedMap[productId] || 0));
    }

    // Capture FULL fleet cache ONLY if no productIds filter supplied
    if (!productIds || productIds.length === 0) {
        setCache(CACHE_KEYS.AVAILABILITY_MAP, availabilityMap, TTL.AVAILABILITY);
    }

    return { totalMap, availabilityMap };
}

// ─── GET /api/products ────────────────────────────────────────────────────
//
//  Query params:
//    category  — category slug to filter by
//    search    — full-text ilike search on name + shortDescription
//    cursor    — last product id from previous page (for cursor pagination)
//    limit     — items per page (default 20, max 50)
//
//  Response: { products: Product[], nextCursor: string | null, hasMore: boolean }

export async function GET(req: NextRequest) {
    const { searchParams } = new URL(req.url);
    const categorySlug = searchParams.get("category") || "";
    const search = searchParams.get("search") || "";
    const cursor = searchParams.get("cursor") || "";
    const featured = searchParams.get("featured") === "true";
    const rawLimit = parseInt(searchParams.get("limit") || String(PAGE_LIMIT), 10);
    const limit = Math.min(Math.max(1, rawLimit), 50);

    // Check page cache (skip cache when using cursor to keep memory cost low)
    const pageKey = CACHE_KEYS.productPage(categorySlug, search, cursor);
    const cachedPage = getCache<object>(pageKey);
    if (cachedPage) {
        return NextResponse.json(cachedPage, {
            headers: { "Cache-Control": "private, s-maxage=30" },
        });
    }

    try {
        // ── 1. Resolve active vendors ──────────────────────────────────────
        const activeVendorsList = await db
            .select({ id: vendors.id })
            .from(vendors)
            .where(eq(vendors.storeStatus, "active"));
        const activeVendorIds = activeVendorsList.map((v) => v.id);

        const vendorFilter = activeVendorIds.length > 0
            ? or(isNull(products.vendorId), inArray(products.vendorId, activeVendorIds))
            : isNull(products.vendorId);

        // ── 2. Resolve category filter ─────────────────────────────────────
        let categoryFilter: ReturnType<typeof eq> | undefined;
        if (categorySlug) {
            const cat = await db
                .select({ id: categories.id })
                .from(categories)
                .where(eq(categories.slug, categorySlug))
                .limit(1);
            if (!cat.length) {
                return NextResponse.json(
                    { products: [], nextCursor: null, hasMore: false },
                    { headers: { "Cache-Control": "private, s-maxage=30" } }
                );
            }
            categoryFilter = eq(products.categoryId, cat[0].id);
        }

        // ── 3. Build search filter ─────────────────────────────────────────
        const searchFilter = search
            ? or(
                ilike(products.name, `%${search}%`),
                ilike(products.shortDescription, `%${search}%`)
            )
            : undefined;

        // ── 4. Cursor: fetch one extra item to know if there's a next page ─
        //    We use createdAt + id for stable ordering.
        //    Cursor is the id of the last item seen.
        let cursorFilter: ReturnType<typeof gt> | undefined;
        if (cursor) {
            // Get the createdAt of the cursor item for keyset pagination
            const cursorRow = await db
                .select({ createdAt: products.createdAt })
                .from(products)
                .where(eq(products.id, cursor))
                .limit(1);
            if (cursorRow.length) {
                cursorFilter = gt(products.createdAt, cursorRow[0].createdAt);
            }
        }

        // Combine all where clauses
        const filters = [
            vendorFilter,
            categoryFilter,
            searchFilter,
            cursorFilter,
            featured ? eq(products.featured, true) : undefined,
            eq(products.isPublished, true),
        ].filter(Boolean);

        const whereClause = filters.length > 0 ? and(...(filters as any)) : undefined;

        // ── 5. Fetch limit+1 items (micro-payload columns only) ────────────
        const rows = await db
            .select({
                id: products.id,
                name: products.name,
                slug: products.slug,
                shortDescription: products.shortDescription,
                thumbnailUrl: products.thumbnailUrl,
                showPrice: products.showPrice,
                priceType: products.priceType,
                priceRangeMax: products.priceRangeMax,
                pricePerDay: products.pricePerDay,
                pricePerHour: products.pricePerHour,
                unit: products.unit,
                categoryId: products.categoryId,
                vendorId: products.vendorId,
                itemCode: products.itemCode,
                averageRating: products.averageRating,
                reviewCount: products.reviewCount,
                createdAt: products.createdAt,
                // Vendor reliability score for sorting
                vendorScoreRating: vendors.scoreRating,
                vendorCompanyName: vendors.companyName,
                // Category name + slug for the card badge
                categoryName: categories.name,
                categorySlugCol: categories.slug,
            })
            .from(products)
            .leftJoin(vendors, eq(products.vendorId, vendors.id))
            .leftJoin(categories, eq(products.categoryId, categories.id))
            .where(whereClause)
            .orderBy(sql`${vendors.scoreRating} DESC NULLS LAST, ${products.averageRating} DESC NULLS LAST, ${products.createdAt} ASC`)
            .limit(limit + 1); // fetch one extra to determine hasMore

        const hasMore = rows.length > limit;
        const pageRows = hasMore ? rows.slice(0, limit) : rows;

        // ── 6. Availability (from cache or computed) ───────────────────────
        const productIds = pageRows.map((r) => r.id);
        const { totalMap, availabilityMap } = productIds.length > 0
            ? await getAvailabilityMap(productIds)
            : { totalMap: {}, availabilityMap: {} };

        // ── 7. Shape the response ──────────────────────────────────────────
        const result = pageRows.map((row) => ({
            id: row.id,
            name: row.name,
            slug: row.slug,
            shortDescription: row.shortDescription,
            thumbnailUrl: row.thumbnailUrl,
            showPrice: row.showPrice,
            priceType: row.priceType,
            priceRangeMax: row.priceRangeMax,
            pricePerDay: row.pricePerDay,
            pricePerHour: row.pricePerHour,
            unit: row.unit,
            itemCode: row.itemCode,
            averageRating: row.averageRating,
            reviewCount: row.reviewCount,
            category: row.categoryName
                ? { name: row.categoryName, slug: row.categorySlugCol ?? "" }
                : null,
            vendor: row.vendorCompanyName
                ? { companyName: row.vendorCompanyName, scoreRating: row.vendorScoreRating }
                : null,
            totalUnits: totalMap[row.id] ?? 0,
            currentAvailableUnits: availabilityMap[row.id] ?? 0,
        }));

        const nextCursor = hasMore ? pageRows[pageRows.length - 1].id : null;

        const responseBody = { products: result, nextCursor, hasMore };

        // Cache this page for 30 seconds (skip caching search queries — too variable)
        if (!search) {
            setCache(pageKey, responseBody, TTL.PRODUCT_PAGE);
        }

        return NextResponse.json(responseBody, {
            headers: { "Cache-Control": "private, s-maxage=30" },
        });
    } catch (e) {
        console.error("Error fetching products:", e);
        return NextResponse.json(
            { products: [], nextCursor: null, hasMore: false },
            { status: 500 }
        );
    }
}
