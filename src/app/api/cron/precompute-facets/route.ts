import { db } from "@/lib/db";
import { products, categories, vendors, inventoryUnits, bookings, inventoryOverrides } from "@/lib/db/schema";
import { eq, and, inArray, or, isNull, sql, lte, gte } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { setCache, CACHE_KEYS, TTL } from "@/lib/catalog-cache";
import { verifyCronAuthorization, methodNotAllowedResponse, unauthorizedCronResponse } from "@/lib/cron-auth";
import { isUnitAllocatable } from "@/lib/availability";

export const dynamic = "force-dynamic";

/**
 * GET is strictly forbidden.
 * Returns HTTP 405 Method Not Allowed with Allow: POST header.
 */
export async function GET() {
    return methodNotAllowedResponse();
}

/**
 * POST /api/cron/precompute-facets
 * Precomputes per-category product counts and allocatable availability snapshot.
 */
export async function POST(req: NextRequest) {
    if (!verifyCronAuthorization(req)) {
        return unauthorizedCronResponse();
    }

    try {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setDate(today.getDate() + 1);

        // ── 1. Per-category product counts ─────────────────────────────────
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

        // ── 2. Full availability snapshot (Allocatable physical units only) ──
        const allPhysicalUnits = await db
            .select({
                productId: inventoryUnits.productId,
                availabilityStatus: inventoryUnits.availabilityStatus,
                conditionStatus: inventoryUnits.conditionStatus,
            })
            .from(inventoryUnits);

        const totalMap: Record<string, number> = {};
        const allocatableMap: Record<string, number> = {};

        for (const unit of allPhysicalUnits) {
            totalMap[unit.productId] = (totalMap[unit.productId] || 0) + 1;
            if (isUnitAllocatable(unit)) {
                allocatableMap[unit.productId] = (allocatableMap[unit.productId] || 0) + 1;
            }
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
        for (const [productId, allocatableCount] of Object.entries(allocatableMap)) {
            availabilityMap[productId] = Math.max(0, allocatableCount - (bookedMap[productId] || 0));
        }
        setCache(CACHE_KEYS.AVAILABILITY_MAP, availabilityMap, TTL.AVAILABILITY);

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
