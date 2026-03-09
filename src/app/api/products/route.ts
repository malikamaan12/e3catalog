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

    let result;

    if (categorySlug) {
        const category = await db.query.categories.findFirst({
            where: eq(categories.slug, categorySlug),
        });
        if (!category) {
            return NextResponse.json({ error: "Category not found" }, { status: 404 });
        }
        result = await db.query.products.findMany({
            where: (products, { and, eq, inArray, or, isNull }) => and(
                eq(products.categoryId, category.id),
                activeVendorIds.length > 0
                    ? or(isNull(products.vendorId), inArray(products.vendorId, activeVendorIds))
                    : isNull(products.vendorId)
            ),
            columns: {
                id: true,
                name: true,
                slug: true,
                shortDescription: true,
                showPrice: true,
                priceType: true,
                priceRangeMax: true,
                pricePerDay: true,
                pricePerHour: true,
                unit: true,
                thumbnailUrl: true,
                categoryId: true,
                dimensions: true,
                vendorId: true,
                itemCode: true,
            },
            with: {
                category: { columns: { name: true, slug: true } },
                inventoryUnits: { columns: { id: true } }
            },
        });
    } else {
        result = await db.query.products.findMany({
            where: (products, { inArray, or, isNull }) =>
                activeVendorIds.length > 0
                    ? or(isNull(products.vendorId), inArray(products.vendorId, activeVendorIds))
                    : isNull(products.vendorId),
            columns: {
                id: true,
                name: true,
                slug: true,
                shortDescription: true,
                showPrice: true,
                priceType: true,
                priceRangeMax: true,
                pricePerDay: true,
                pricePerHour: true,
                unit: true,
                thumbnailUrl: true,
                categoryId: true,
                dimensions: true,
                vendorId: true,
                itemCode: true,
            },
            with: {
                category: { columns: { name: true, slug: true } },
                inventoryUnits: { columns: { id: true } }
            },
        });
    }

    // Attach real-time availability to each product for the 🟢🟡🔴 indicator
    // Look ahead 1 day to get today's exact available stock factoring in buffer times
    const productsWithAvailability = await Promise.all(
        result.map(async (prod: any) => {
            const timeline = await getAvailabilityTimeline(prod.id, 1);
            const totalUnits = prod.inventoryUnits?.length || 0;
            const currentAvail = timeline.length > 0 ? timeline[0].available : totalUnits;

            return {
                ...prod,
                totalUnits,
                currentAvailableUnits: currentAvail,
            };
        })
    );

    return NextResponse.json(productsWithAvailability);
}
