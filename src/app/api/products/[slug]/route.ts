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

    // Increment View Count asynchronously
    // We don't need to await this to block the response
    db.update(products)
        .set({ viewCount: sql`${products.viewCount} + 1` })
        .where(eq(products.id, product.id))
        .execute()
        .catch(console.error);

    // Exclude internal notes from public API
    const { adminNotes, ...publicProduct } = product as any;

    return NextResponse.json(publicProduct);
    } catch (error) {
        console.error("[PRODUCT DETAIL] Error:", error);
        return NextResponse.json({ error: "Failed to load product" }, { status: 500 });
    }
}
