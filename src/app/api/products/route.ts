import { db } from "@/lib/db";
import { products, categories, vendors } from "@/lib/db/schema";
import { eq, inArray } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { getAvailabilityTimeline } from "@/lib/availability";

export async function GET(req: NextRequest) {
    const { searchParams } = new URL(req.url);
    const categorySlug = searchParams.get("category");

    // Fetch active vendors first
    const activeVendorsList = await db.query.vendors.findMany({
        where: eq(vendors.storeStatus, "active"),
        columns: { id: true }
    });
    const activeVendorIds = activeVendorsList.map(v => v.id);

    // Platform products (vendorId === null) should always be visible.

    try {
        let result;

        if (categorySlug) {
            const category = await db.query.categories.findFirst({
                where: eq(categories.slug, categorySlug),
            });
            if (!category) {
                return NextResponse.json([]); // Return empty array to protect frontend
            }
            result = await db.query.products.findMany({
                where: (products, { and, eq, inArray, or, isNull }) => and(
                    eq(products.categoryId, category.id),
                    activeVendorIds.length > 0
                        ? or(isNull(products.vendorId), inArray(products.vendorId, activeVendorIds))
                        : isNull(products.vendorId)
                ),
                columns: {
                    id: true, name: true, slug: true, shortDescription: true,
                    showPrice: true, priceType: true, priceRangeMax: true, pricePerDay: true, pricePerHour: true,
                    unit: true, thumbnailUrl: true, categoryId: true, dimensions: true, vendorId: true, itemCode: true,
                },
                with: { category: { columns: { name: true, slug: true } }, inventoryUnits: { columns: { id: true } } },
            });
        } else {
            result = await db.query.products.findMany({
                where: (products, { inArray, or, isNull }) =>
                    activeVendorIds.length > 0
                        ? or(isNull(products.vendorId), inArray(products.vendorId, activeVendorIds))
                        : isNull(products.vendorId),
                columns: {
                    id: true, name: true, slug: true, shortDescription: true,
                    showPrice: true, priceType: true, priceRangeMax: true, pricePerDay: true, pricePerHour: true,
                    unit: true, thumbnailUrl: true, categoryId: true, dimensions: true, vendorId: true, itemCode: true,
                },
                with: { category: { columns: { name: true, slug: true } }, inventoryUnits: { columns: { id: true } } },
            });
        }

        const productIds = result.map((p: any) => p.id);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setDate(today.getDate() + 1);

        let activeBookings: any[] = [];
        let activeOverrides: any[] = [];

        if (productIds.length > 0) {
            // Fetch all relevant bookings for these products that overlap TODAY
            activeBookings = await db.query.bookings.findMany({
                where: (b, { and, inArray, lte, gte }) => and(
                    inArray(b.productId, productIds),
                    inArray(b.status, ["approved", "booked"]),
                    lte(b.startDate, tomorrow),
                    gte(b.endDate, today),
                )
            });

            // Fetch manual overrides
            activeOverrides = await db.query.inventoryOverrides.findMany({
                where: (o, { and, inArray, lte, gte }) => and(
                    inArray(o.productId, productIds),
                    lte(o.startDate, tomorrow),
                    gte(o.endDate, today),
                )
            });
        }

        // Group booked units by productId
        const bookedMap: Record<string, number> = {};
        for (const b of activeBookings) {
            bookedMap[b.productId] = (bookedMap[b.productId] || 0) + b.units;
        }
        for (const o of activeOverrides) {
            bookedMap[o.productId] = (bookedMap[o.productId] || 0) + o.unitsOffline;
        }

        const productsWithAvailability = result.map((prod: any) => {
            const totalUnits = prod.inventoryUnits?.length || 0;
            const bookedUnits = bookedMap[prod.id] || 0;
            const currentAvail = Math.max(0, totalUnits - bookedUnits);

            return {
                ...prod,
                totalUnits,
                currentAvailableUnits: currentAvail,
            };
        });

        return NextResponse.json(productsWithAvailability);
    } catch (e) {
        console.error("Error fetching products:", e);
        return NextResponse.json([]); // Fallback to empty array
    }
}
