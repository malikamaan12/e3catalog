import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { products, categories, vendors } from "@/lib/db/schema";
import { eq, and, asc, isNull, inArray } from "drizzle-orm";
import { renderToStream } from "@react-pdf/renderer";
import React from "react";
import VendorCatalogPDF, { VendorCatalogData, CatalogProductItem } from "@/components/pdf/VendorCatalogPDF";
import { format } from "date-fns";

export async function GET(req: NextRequest) {
    try {
        const url = new URL(req.url);
        const vendorId = url.searchParams.get("vendorId");
        const categorySlug = url.searchParams.get("category");
        const categoryId = url.searchParams.get("categoryId");
        const formatParam = url.searchParams.get("format");

        // 1. Fetch vendor profile if vendorId is provided
        let vendorProfile: VendorCatalogData["vendor"] = null;
        if (vendorId) {
            const vendorRow = await db.query.vendors.findFirst({
                where: eq(vendors.id, vendorId),
            });
            if (vendorRow) {
                vendorProfile = {
                    companyName: vendorRow.companyName,
                    phone: vendorRow.phone,
                    email: vendorRow.email,
                    address: vendorRow.address,
                    crNumber: vendorRow.tradeLicenseNumber,
                    taxId: vendorRow.taxId,
                    logoUrl: vendorRow.logoUrl,
                };
            }
        }

        // 2. Build where filter conditions
        const conditions = [];
        if (vendorId) {
            conditions.push(eq(products.vendorId, vendorId));
        }

        if (categoryId) {
            conditions.push(eq(products.categoryId, categoryId));
        }

        const rawProducts = await db.query.products.findMany({
            where: conditions.length > 0 ? and(...conditions) : undefined,
            with: {
                category: true,
                vendor: true,
                media: { orderBy: (media, { asc }) => [asc(media.sortOrder)], limit: 1 },
                inventoryUnits: true,
            },
            orderBy: [asc(products.name)],
        });

        // Optional filter by category slug
        let filteredProducts = rawProducts;
        if (categorySlug) {
            filteredProducts = rawProducts.filter(p => p.category?.slug === categorySlug);
        }

        // 3. Group products by Category
        const categoryMap = new Map<string, { categoryName: string; categorySlug: string; products: CatalogProductItem[] }>();

        for (const p of filteredProducts) {
            const catName = p.category?.name || "General Event Equipment";
            const catSlug = p.category?.slug || "general";

            if (!categoryMap.has(catSlug)) {
                categoryMap.set(catSlug, {
                    categoryName: catName,
                    categorySlug: catSlug,
                    products: [],
                });
            }

            const totalUnits = p.inventoryUnits?.length || 1;

            categoryMap.get(catSlug)!.products.push({
                id: p.id,
                name: p.name,
                slug: p.slug,
                itemCode: p.itemCode,
                brand: p.brand,
                model: p.model,
                shortDescription: p.shortDescription,
                pricePerDay: p.pricePerDay,
                pricePerHour: p.pricePerHour,
                unit: p.unit,
                dimensions: p.dimensions,
                weight: p.weight,
                powerRequirements: p.powerRequirements,
                totalUnits,
                thumbnailUrl: p.thumbnailUrl || (p.media && p.media[0]?.url) || null,
                categoryName: catName,
                categorySlug: catSlug,
                requiresLicense: p.requiresLicense,
            });
        }

        const categoryGroups = Array.from(categoryMap.values());
        const totalAssetsCount = filteredProducts.reduce((sum, p) => sum + (p.inventoryUnits?.length || 1), 0);
        const totalCategoriesCount = categoryGroups.length;

        const baseUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_BASE_URL || "https://rentals.e3qatar.com";

        const catalogTitle = vendorProfile 
            ? `${vendorProfile.companyName} Equipment Fleet Catalog` 
            : (categorySlug ? `${categorySlug.toUpperCase()} Equipment Catalog` : "Official Rental Fleet Catalog");

        const catalogData: VendorCatalogData = {
            title: catalogTitle,
            edition: `2026/2027 Edition · Q${Math.floor(new Date().getMonth() / 3) + 1}`,
            generatedAt: format(new Date(), "MMMM do, yyyy"),
            vendor: vendorProfile,
            categoryGroups,
            totalAssetsCount,
            totalCategoriesCount,
            webUrl: baseUrl,
        };

        if (formatParam === "json" || req.headers.get("accept")?.includes("application/json")) {
            return NextResponse.json({ success: true, data: catalogData });
        }

        const stream = await renderToStream(React.createElement(VendorCatalogPDF, { data: catalogData }) as any);

        const safeFilename = (vendorProfile?.companyName || (categorySlug ? `${categorySlug}-Equipment` : "Complete-Fleet"))
            .replace(/[^a-zA-Z0-9_-]/g, "_");

        return new NextResponse(stream as any, {
            headers: {
                "Content-Type": "application/pdf",
                "Content-Disposition": `attachment; filename="E3-Rentals-${safeFilename}-Catalog.pdf"`,
            },
        });
    } catch (error: any) {
        console.error("Catalog PDF generation error:", error);
        return NextResponse.json({ error: "Failed to generate catalog PDF", details: error?.message }, { status: 500 });
    }
}
