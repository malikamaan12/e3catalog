import { db } from "@/lib/db";
import { products, vendors, categories } from "@/lib/db/schema";
import { eq, and, desc, sql } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { nanoid } from "nanoid";
import { USER_ROLES } from "@/lib/constants";

export async function GET(req: NextRequest) {
    const user = await getCurrentUser();
    if (!user || user.role !== USER_ROLES.VENDOR) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const vendorData = await db
        .select()
        .from(vendors)
        .where(eq(vendors.userId, user.id))
        .limit(1);
    
    const vendor = vendorData[0];
    if (!vendor) {
        return NextResponse.json({ error: "Vendor profile not found" }, { status: 404 });
    }

    const vendorProducts = await db
        .select({
            id: products.id,
            name: products.name,
            slug: products.slug,
            pricePerDay: products.pricePerDay,
            unit: products.unit,
            thumbnailUrl: products.thumbnailUrl,
            status: sql<string>`CASE WHEN ${products.requiresApproval} THEN 'pending' ELSE 'active' END`,
            createdAt: products.createdAt,
            categoryName: categories.name,
        })
        .from(products)
        .leftJoin(categories, eq(products.categoryId, categories.id))
        .where(eq(products.vendorId, vendor.id))
        .orderBy(desc(products.createdAt));

    return NextResponse.json(vendorProducts);
}

export async function POST(req: NextRequest) {
    const user = await getCurrentUser();
    if (!user || user.role !== USER_ROLES.VENDOR) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const vendorData = await db
        .select()
        .from(vendors)
        .where(eq(vendors.userId, user.id))
        .limit(1);
    
    const vendor = vendorData[0];
    if (!vendor) {
        return NextResponse.json({ error: "Vendor profile not found" }, { status: 404 });
    }

    try {
        const body = await req.json();
        const { name, categoryId, pricePerDay, unit, description, shortDescription, thumbnailUrl } = body;

        if (!name || !categoryId || !pricePerDay) {
            return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
        }

        const id = `prod_${nanoid(10)}`;
        const slug = `${name.toLowerCase().replace(/ /g, "-")}-${nanoid(4)}`;

        const [newProduct] = await db.insert(products).values({
            id,
            vendorId: vendor.id,
            categoryId,
            name,
            slug,
            pricePerDay: parseFloat(pricePerDay),
            unit: unit || "unit",
            description,
            shortDescription,
            thumbnailUrl,
            requiresApproval: true, // Marketplace safety: new products need admin review
        }).returning();

        return NextResponse.json(newProduct);
    } catch (err) {
        console.error("Vendor Product Creation Error:", err);
        return NextResponse.json({ error: "Failed to create product" }, { status: 500 });
    }
}
