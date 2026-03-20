import { db } from "@/lib/db";
import { products, categories, vendors, inventoryUnits, bookings, inventoryOverrides } from "@/lib/db/schema";
import { eq, and, inArray, or, isNull, sql, lte, gte } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { setCache, CACHE_KEYS, TTL } from "@/lib/catalog-cache";

const CRON_SECRET = process.env.CRON_SECRET;

/**
 * GET /api/cron/precompute-facets
 *
 * Precomputes:
 *   1. Per-category product counts
 *   2. Today's availability snapshot (total units - booked units) per product
 *
 * Writes both to the in-process catalog cache with a 6-minute TTL.
 * Called by Vercel Cron (vercel.json) and also manually from the products API
 * on a cold start (cache miss).
 *
 * Security: Vercel Cron automatically adds Authorization header.
 * You can also set CRON_SECRET and pass it as ?secret=… for manual hits.
 */
export async function GET(req: NextRequest) {
    // Minimal auth guard — skip in development
    if (CRON_SECRET && process.env.NODE_ENV !== "development") {
        const authHeader = req.headers.get("Authorization");
        const secretParam = new URL(req.url).searchParams.get("secret");
        if (authHeader !== `Bearer ${CRON_SECRET}` && secretParam !== CRON_SECRET) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }
    }

    try {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setDate(today.getDate() + 1);

        // ── 1. Per-category product counts ─────────────────────────────────
        // Fetch active vendors for the filter
        const activeVendors = await db
            .select({ id: vendors.id })
            .from(vendors)
            .where(eq(vendors.storeStatus, "active"));
        const activeVendorIds = activeVendors.map((v) => v.id);

        const vendorFilter = activeVendorIds.length > 0
            ? or(isNull(products.vendorId), inArray(products.vendorId, activeVendorIds))
            : isNull(products.vendorId);

        const categoryCounts = await db
            .select({
                categoryId: products.categoryId,
                categorySlug: categories.slug,
                count: sql<number>`count(${products.id})`,
            })
            .from(products)
            .leftJoin(categories, eq(products.categoryId, categories.id))
            .where(vendorFilter)
            .groupBy(products.categoryId, categories.slug);

        const facets: Record<string, { count: number }> = {};
        for (const row of categoryCounts) {
            if (row.categorySlug) {
                facets[row.categorySlug] = { count: Number(row.count) };
            }
        }
        setCache(CACHE_KEYS.FACETS, facets, TTL.FACETS);

        // ── 2. Full availability snapshot ──────────────────────────────────
        // Total units per product (aggregate, no row explosion)
        const unitCounts = await db
            .select({
                productId: inventoryUnits.productId,
                total: sql<number>`count(*)`,
            })
            .from(inventoryUnits)
            .groupBy(inventoryUnits.productId);

        const totalMap: Record<string, number> = {};
        for (const row of unitCounts) {
            totalMap[row.productId] = Number(row.total);
        }

        // Booked units today
        const activeBookings = await db
            .select({
                productId: bookings.productId,
                units: sql<number>`sum(${bookings.units})`,
            })
            .from(bookings)
            .where(and(
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
        setCache(CACHE_KEYS.AVAILABILITY_MAP, availabilityMap, TTL.AVAILABILITY);

        console.log(`[cron] precompute-facets: ${categoryCounts.length} categories, ${Object.keys(availabilityMap).length} products cached.`);

        return NextResponse.json({
            ok: true,
            categoriesCached: categoryCounts.length,
            productsCached: Object.keys(availabilityMap).length,
        });
    } catch (e) {
        console.error("[cron] precompute-facets error:", e);
        return NextResponse.json({ ok: false, error: String(e) }, { status: 500 });
    }
}
