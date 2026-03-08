import { db } from "@/lib/db";
import { products } from "@/lib/db/schema";
import { eq, or } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";

export async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ slug: string }> }
) {
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

    // Exclude internal notes from public API
    const { adminNotes, ...publicProduct } = product as any;

    return NextResponse.json(publicProduct);
}
