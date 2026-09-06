import { db } from "@/lib/db";
import { products, categories, vendors, inventoryUnits, bookings, inventoryOverrides } from "@/lib/db/schema";
import { eq, and, inArray, or, isNull, ilike, gt, sql, lte, gte } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import {
    getCache, setCache,
    CACHE_KEYS, TTL,
} from "@/lib/catalog-cache";
import { isUnitAllocatable } from "@/lib/availability";

const PAGE_LIMIT = 20;

// ─── Availability helpers ──────────────────────────────────────────────────

interface AvailabilityResult {
    totalMap: Record<string, number>;
    availabilityMap: Record<string, number>;
}

async function getAvailabilityMap(productIds: string[], startDate?: string | null, endDate?: string | null): Promise<AvailabilityResult> {
    if (startDate && endDate) {
        return computeAndCacheAvailability(productIds, startDate, endDate);
    }

    const cached = getCache<Record<string, number>>(CACHE_KEYS.AVAILABILITY_MAP);
    
    if (cached) {
        const totalMap = await computeTotalsOnly(productIds);
        return { totalMap, availabilityMap: cached };
    }

    return computeAndCacheAvailability(productIds);
}

async function computeTotalsOnly(productIds: string[]): Promise<Record<string, number>> {
    const units = await db
        .select({
            productId: inventoryUnits.productId,
            availabilityStatus: inventoryUnits.availabilityStatus,
            conditionStatus: inventoryUnits.conditionStatus,
        })
        .from(inventoryUnits)
        .where(inArray(inventoryUnits.productId, productIds));

    const totalMap: Record<string, number> = {};
    for (const u of units) {
        if (isUnitAllocatable(u)) {
            totalMap[u.productId] = (totalMap[u.productId] || 0) + 1;
        }
    }
    return totalMap;
}

export async function computeAndCacheAvailability(
    productIds?: string[],
    startStr?: string | null,
    endStr?: string | null
): Promise<AvailabilityResult> {
    let checkStart = new Date();
    checkStart.setHours(0, 0, 0, 0);
    let checkEnd = new Date(checkStart);
    checkEnd.setDate(checkStart.getDate() + 1);

    const isCustomDate = !!(startStr && endStr);
    if (isCustomDate) {
        checkStart = new Date(startStr);
        checkEnd = new Date(endStr);
        checkEnd.setHours(23, 59, 59, 999);
    }

    // 1. Fetch physical units and calculate total and allocatable pool
    const units = await db
        .select({
            productId: inventoryUnits.productId,
            availabilityStatus: inventoryUnits.availabilityStatus,
            conditionStatus: inventoryUnits.conditionStatus,
        })
        .from(inventoryUnits)
        .where(productIds && productIds.length > 0
            ? inArray(inventoryUnits.productId, productIds)
            : undefined
        );

    const totalMap: Record<string, number> = {};
    const allocatableMap: Record<string, number> = {};

    for (const u of units) {
        totalMap[u.productId] = (totalMap[u.productId] || 0) + 1;
        if (isUnitAllocatable(u)) {
            allocatableMap[u.productId] = (allocatableMap[u.productId] || 0) + 1;
        }
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
            lte(bookings.startDate, checkEnd),
            gte(bookings.endDate, checkStart),
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
            lte(inventoryOverrides.startDate, checkEnd),
            gte(inventoryOverrides.endDate, checkStart),
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
    for (const [productId, allocatableCount] of Object.entries(allocatableMap)) {
        availabilityMap[productId] = Math.max(0, allocatableCount - (bookedMap[productId] || 0));
    }

    if (!productIds || productIds.length === 0) {
        if (!isCustomDate) {
            setCache(CACHE_KEYS.AVAILABILITY_MAP, availabilityMap, TTL.AVAILABILITY);
        }
    }

    return { totalMap, availabilityMap };
}

// ─── GET /api/products ────────────────────────────────────────────────────
//
//  Query params:
//    category  — category slug to filter by
//    search    — full-text ilike search on name + shortDescription
//    vendorId  — specific vendor ID to filter by
//    startDate — string to trigger custom availability check
//    endDate   — string to trigger custom availability check
//    cursor    — last product id from previous page (for cursor pagination)
//    limit     — items per page (default 20, max 50)
//
//  Response: { products: Product[], nextCursor: string | null, hasMore: boolean }

export async function GET(req: NextRequest) {
    const { searchParams } = new URL(req.url);
    const categorySlug = searchParams.get("category") || "";
    const search = searchParams.get("search") || "";
    const vendorId = searchParams.get("vendorId") || "";
    const startDate = searchParams.get("startDate") || "";
    const endDate = searchParams.get("endDate") || "";
    const cursor = searchParams.get("cursor") || "";
    const featured = searchParams.get("featured") === "true";
    const rawLimit = parseInt(searchParams.get("limit") || String(PAGE_LIMIT), 10);
    const limit = Math.min(Math.max(1, rawLimit), 50);

    // Check page cache (skip cache when using cursor, custom dates, or specific vendor to keep memory cost low)
    const isCustomFilter = !!(cursor || startDate || endDate || vendorId);
    const pageKey = CACHE_KEYS.productPage(categorySlug, search, isCustomFilter ? `custom-${Date.now()}` : "");
    if (!isCustomFilter) {
        const cachedPage = getCache<object>(pageKey);
        if (cachedPage) {
            return NextResponse.json(cachedPage, {
                headers: { "Cache-Control": "private, s-maxage=30" },
            });
        }
    }

    try {
        // ── 1. Resolve active vendors ──────────────────────────────────────
        let vendorFilter: ReturnType<typeof eq> | ReturnType<typeof or> | undefined;

        if (vendorId) {
            vendorFilter = eq(products.vendorId, vendorId);
        } else {
            let activeVendorIds = getCache<string[]>(CACHE_KEYS.ACTIVE_VENDORS);
            if (!activeVendorIds) {
                const activeVendorsList = await db
                    .select({ id: vendors.id })
                    .from(vendors)
                    .where(eq(vendors.storeStatus, "active"));
                activeVendorIds = activeVendorsList.map((v) => v.id);
                setCache(CACHE_KEYS.ACTIVE_VENDORS, activeVendorIds, 60 * 1000); // 60s cache
            }

            vendorFilter = activeVendorIds.length > 0
                ? or(isNull(products.vendorId), inArray(products.vendorId, activeVendorIds))
                : isNull(products.vendorId);
        }

        // ── 2. Resolve category filter ─────────────────────────────────────
        let categoryFilter: ReturnType<typeof inArray> | ReturnType<typeof eq> | undefined;
        if (categorySlug) {
            let catIds = getCache<string[]>(`cat_slug_ids::${categorySlug}`);
            if (!catIds) {
                const cat = await db
                    .select({ id: categories.id })
                    .from(categories)
                    .where(eq(categories.slug, categorySlug))
                    .limit(1);
                if (!cat.length) {
                    return NextResponse.json(
                        { products: [], nextCursor: null, hasMore: false, totalMatchingFound: 0 },
                        { headers: { "Cache-Control": "private, s-maxage=30" } }
                    );
                }
                const parentId = cat[0].id;
                // Also include any subcategories under this parent category
                const childCats = await db
                    .select({ id: categories.id })
                    .from(categories)
                    .where(eq(categories.parentId, parentId));
                catIds = [parentId, ...childCats.map((c) => c.id)];
                setCache(`cat_slug_ids::${categorySlug}`, catIds, 300 * 1000); // 5 min cache
            }
            categoryFilter = catIds.length === 1 
                ? eq(products.categoryId, catIds[0])
                : inArray(products.categoryId, catIds);
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

        const minPrice = searchParams.get("minPrice") ? Number(searchParams.get("minPrice")) : null;
        const maxPrice = searchParams.get("maxPrice") ? Number(searchParams.get("maxPrice")) : null;

        // Combine all where clauses
        const filters = [
            vendorFilter,
            categoryFilter,
            searchFilter,
            cursorFilter,
            featured ? eq(products.featured, true) : undefined,
            minPrice !== null ? gte(products.pricePerDay, minPrice) : undefined,
            maxPrice !== null ? lte(products.pricePerDay, maxPrice) : undefined,
            eq(products.isPublished, true),
            or(
                eq(products.status, "published"),
                eq(products.status, "active"),
                eq(products.status, "approved"),
                isNull(products.status)
            ),
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

        const totalRowsQueryResult = await db
            .select({ count: sql<number>`count(*)` })
            .from(products)
            .leftJoin(vendors, eq(products.vendorId, vendors.id))
            .leftJoin(categories, eq(products.categoryId, categories.id))
            .where(whereClause);
        const totalMatchingFound = Number(totalRowsQueryResult[0]?.count || 0);

        const hasMore = rows.length > limit;
        const pageRows = hasMore ? rows.slice(0, limit) : rows;

        // ── 6. Availability (from cache or computed) ───────────────────────
        const productIds = pageRows.map((r) => r.id);
        const { totalMap, availabilityMap } = productIds.length > 0
            ? await getAvailabilityMap(productIds, startDate, endDate)
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

        const responseBody = { products: result, nextCursor, hasMore, totalMatchingFound };

        // Cache this page for 30 seconds (skip caching search queries or custom filters)
        if (!search && !isCustomFilter) {
            setCache(pageKey, responseBody, TTL.PRODUCT_PAGE);
        }

        return NextResponse.json(responseBody, {
            headers: { "Cache-Control": "private, s-maxage=30" },
        });
    } catch (e: any) {
        console.error("Error fetching products:", e);
        return NextResponse.json(
            { 
                products: [], 
                nextCursor: null, 
                hasMore: false, 
                totalMatchingFound: 0,
                error: e?.message || "Data connection failure while retrieving products" 
            },
            { status: 500 }
        );
    }
}
