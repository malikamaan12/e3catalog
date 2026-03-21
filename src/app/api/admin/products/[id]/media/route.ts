import { db } from "@/lib/db";
import { productMedia, products } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { v4 as uuid } from "uuid";
import { requireAdmin } from "@/lib/requireAdmin";

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
    const { user, error } = await requireAdmin(["admin", "super_admin", "vendor"]);
    if (error) return error;

    const productId = params.id;
    const isSuperAdmin = user.role === 'super_admin' || user.role === 'admin';
    const vendorId = isSuperAdmin ? null : (user as any).vendorId;

    // Verify product ownership if vendor
    if (vendorId) {
        const product = await db.query.products.findFirst({
            where: and(eq(products.id, productId), eq(products.vendorId, vendorId))
        });
        if (!product) return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    try {
        const body = await req.json();
        const { type, url, alt, sortOrder } = body;

        if (!url) return NextResponse.json({ error: "URL is required" }, { status: 400 });

        const id = uuid();
        await db.insert(productMedia).values({
            id,
            productId,
            type: type || "image",
            url,
            alt: alt || null,
            sortOrder: sortOrder || 0,
        });

        console.log(`Media added to product ${productId}:`, id);
        return NextResponse.json({ id, success: true }, { status: 201 });
    } catch (err: any) {
        console.error("MEDIA ADD ERROR:", err);
        return NextResponse.json({ error: err.message || "Failed to add media" }, { status: 500 });
    }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
    const { user, error } = await requireAdmin(["admin", "super_admin", "vendor"]);
    if (error) return error;

    const productId = params.id;
    const { searchParams } = new URL(req.url);
    const mediaId = searchParams.get("mediaId");

    if (!mediaId) return NextResponse.json({ error: "Media ID required" }, { status: 400 });

    const isSuperAdmin = user.role === 'super_admin' || user.role === 'admin';
    const vendorId = isSuperAdmin ? null : (user as any).vendorId;

    // Verify product ownership
    if (vendorId) {
        const product = await db.query.products.findFirst({
            where: and(eq(products.id, productId), eq(products.vendorId, vendorId))
        });
        if (!product) return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    try {
        await db.delete(productMedia).where(and(
            eq(productMedia.id, mediaId),
            eq(productMedia.productId, productId)
        ));
        
        console.log(`Media ${mediaId} deleted from product ${productId}`);
        return NextResponse.json({ success: true });
    } catch (err: any) {
        console.error("MEDIA DELETE ERROR:", err);
        return NextResponse.json({ error: err.message || "Failed to delete media" }, { status: 500 });
    }
}
