import { db } from "@/lib/db";
import { products } from "@/lib/db/schema";
import { eq, or, sql } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";

export async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ slug: string }> }
) {
    try {
        const { slug } = await params;

        const product = await db.query.products.findFirst({
            where: or(eq(products.slug, slug), eq(products.id, slug)),
            with: {
                category: true,
                media: { orderBy: (media, { asc }) => [asc(media.sortOrder)] },
                documents: true,
                safetyCertificates: true,
                installationGuides: true,
            },
        });

        if (!product) {
            return NextResponse.json({ error: "Product not found" }, { status: 404 });
        }

        // Unapproved / Archived check for public requests
        if (product.status === "archived" || (!product.isPublished && product.status !== "published")) {
            return NextResponse.json({ error: "Product unavailable or archived" }, { status: 404 });
        }

        // Increment View Count asynchronously
        db.update(products)
            .set({ viewCount: sql`${products.viewCount} + 1` })
            .where(eq(products.id, product.id))
            .execute()
            .catch(console.error);

        // Sanitize minimal public product DTO
        const publicProduct = {
            id: product.id,
            name: product.name,
            slug: product.slug,
            brand: product.brand,
            model: product.model,
            shortDescription: product.shortDescription,
            description: product.description,
            dimensions: product.dimensions,
            weight: product.weight,
            powerRequirements: product.powerRequirements,
            materials: product.materials,
            showPrice: product.showPrice,
            priceType: product.priceType,
            priceRangeMax: product.priceRangeMax,
            pricePerDay: product.pricePerDay,
            pricePerHour: product.pricePerHour,
            packagingFee: product.packagingFee,
            handlingFee: product.handlingFee,
            setupFee: product.setupFee,
            unit: product.unit,
            minOrderQty: product.minOrderQty,
            installTime: product.installTime,
            dismantleTime: product.dismantleTime,
            cleaningTime: product.cleaningTime,
            manpower: product.manpower,
            tools: product.tools,
            thumbnailUrl: product.thumbnailUrl,
            featured: product.featured,
            requiresLicense: product.requiresLicense,
            requiresApproval: product.requiresApproval,
            show3d: product.media?.some(m => m.type === "model3d") ?? false,
            showVideo: product.media?.some(m => m.type === "video") ?? false,
            averageRating: product.averageRating,
            reviewCount: product.reviewCount,
            category: product.category ? {
                id: product.category.id,
                name: product.category.name,
                slug: product.category.slug,
            } : null,
            media: product.media?.map(m => ({
                id: m.id,
                url: m.url,
                type: m.type,
                alt: m.alt,
                sortOrder: m.sortOrder,
            })) || [],
            documents: product.documents?.map(d => ({
                id: d.id,
                name: d.name,
                url: d.url,
                fileType: d.type,
            })) || [],
            safetyCertificates: product.safetyCertificates?.map(c => ({
                id: c.id,
                certName: c.certName,
                certNumber: c.certNumber,
                issuingBody: c.issuingBody,
                issueDate: c.issueDate,
                expiryDate: c.expiryDate,
            })) || [],
            installationGuides: product.installationGuides?.map(g => ({
                id: g.id,
                guideType: g.guideType,
                content: g.content,
                requiredManpower: g.requiredManpower,
                estimatedTime: g.estimatedTime,
                toolsRequired: g.toolsRequired,
            })) || [],
        };

        return NextResponse.json(publicProduct);
    } catch (error) {
        console.error("[PRODUCT DETAIL] Error:", error);
        return NextResponse.json({ error: "Failed to load product" }, { status: 500 });
    }
}
