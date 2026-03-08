import { db } from "@/lib/db";
import { categories } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { v4 as uuid } from "uuid";
import { requireAdmin } from "@/lib/requireAdmin";

export async function GET() {
    const result = await db.query.categories.findMany({
        with: {
            products: { columns: { id: true } },
        },
    });
    // Add product count
    const withCounts = result.map((cat) => ({
        ...cat,
        productCount: cat.products?.length || 0,
        products: undefined,
    }));
    return NextResponse.json(withCounts);
}

export async function POST(req: NextRequest) {
    const { error } = await requireAdmin();
    if (error) return error;

    const body = await req.json();

    if (!body.name?.trim()) {
        return NextResponse.json({ error: "Category name is required" }, { status: 400 });
    }

    const slug = body.name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)/g, "");

    // Check for duplicate slug
    const existing = await db.query.categories.findFirst({
        where: eq(categories.slug, slug),
    });
    if (existing) {
        return NextResponse.json({ error: "A category with this name already exists" }, { status: 409 });
    }

    const category = {
        id: uuid(),
        name: body.name.trim(),
        slug,
        image: body.image || null,
        icon: body.icon || null,
        description: body.description || null,
        active: body.active !== false,
    };

    await db.insert(categories).values(category);
    return NextResponse.json(category, { status: 201 });
}

export async function PUT(req: NextRequest) {
    const { error } = await requireAdmin();
    if (error) return error;

    const body = await req.json();
    const { id, ...updates } = body;

    if (!id) {
        return NextResponse.json({ error: "Category ID required" }, { status: 400 });
    }

    if (updates.name) {
        updates.slug = updates.name
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, "-")
            .replace(/(^-|-$)/g, "");
    }

    await db.update(categories).set(updates).where(eq(categories.id, id));

    const updated = await db.query.categories.findFirst({
        where: eq(categories.id, id),
    });

    return NextResponse.json(updated);
}

export async function PATCH(req: NextRequest) {
    // Toggle active status
    const { error } = await requireAdmin();
    if (error) return error;

    const body = await req.json();
    const { id, active } = body;

    if (!id) {
        return NextResponse.json({ error: "Category ID required" }, { status: 400 });
    }

    await db.update(categories).set({ active }).where(eq(categories.id, id));

    const updated = await db.query.categories.findFirst({
        where: eq(categories.id, id),
    });

    return NextResponse.json(updated);
}

export async function DELETE(req: NextRequest) {
    const { error } = await requireAdmin();
    if (error) return error;

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
        return NextResponse.json({ error: "Category ID required" }, { status: 400 });
    }

    // Check if category has products
    const category = await db.query.categories.findFirst({
        where: eq(categories.id, id),
        with: { products: { columns: { id: true } } },
    });

    if (category?.products && category.products.length > 0) {
        return NextResponse.json(
            { error: `Cannot delete: ${category.products.length} products are in this category` },
            { status: 409 }
        );
    }

    await db.delete(categories).where(eq(categories.id, id));
    return NextResponse.json({ success: true });
}
