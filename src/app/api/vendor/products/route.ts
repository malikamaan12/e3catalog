import { db } from "@/lib/db";
import { products, vendors, categories, inventoryUnits, productMedia } from "@/lib/db/schema";
import { eq, and, desc, sql } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { v4 as uuid } from "uuid";
import { USER_ROLES, PRODUCT_STATUS } from "@/lib/constants";
import { logProductLifecycleEvent } from "@/lib/product-lifecycle";
import { isUnitAllocatable } from "@/lib/availability";

export async function GET(req: NextRequest) {
    const user = await getCurrentUser();
    if (!user || user.role !== USER_ROLES.VENDOR) {
        return NextResponse.json({ error: "Unauthorized: Vendor access required" }, { status: 401 });
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

    const vendorProducts = await db.query.products.findMany({
        where: eq(products.vendorId, vendor.id),
        with: {
            category: { columns: { id: true, name: true, slug: true } },
            media: { orderBy: (media, { asc }) => [asc(media.sortOrder)] },
            inventoryUnits: { columns: { id: true, availabilityStatus: true, conditionStatus: true } },
        },
        orderBy: [desc(products.createdAt)],
    });

    const sanitized = vendorProducts.map(p => {
        const units = p.inventoryUnits || [];
        const allocatable = units.filter(isUnitAllocatable).length;

        return {
            id: p.id,
            name: p.name,
            slug: p.slug,
            itemCode: p.itemCode,
            pricePerDay: p.pricePerDay,
            unit: p.unit,
            thumbnailUrl: p.thumbnailUrl,
            status: p.status || (p.isPublished ? PRODUCT_STATUS.PUBLISHED : PRODUCT_STATUS.DRAFT),
            isPublished: p.isPublished,
            totalUnits: units.length,
            allocatableUnits: allocatable,
            createdAt: p.createdAt,
            categoryName: p.category?.name || "Uncategorized",
            categoryId: p.categoryId,
            shortDescription: p.shortDescription,
            description: p.description,
            brand: p.brand,
            model: p.model,
            dimensions: p.dimensions,
            weight: p.weight,
        };
    });

    return NextResponse.json(sanitized);
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
        const { 
            name, 
            categoryId, 
            pricePerDay, 
            unit, 
            description, 
            shortDescription, 
            thumbnailUrl,
            status: requestedStatus,
            totalUnits,
            condition,
            warehouseLocation,
            brand,
            model,
            dimensions,
            weight,
            powerRequirements,
            materials,
        } = body;

        if (!name?.trim()) {
            return NextResponse.json({ error: "Product name is required" }, { status: 400 });
        }

        if (!categoryId) {
            return NextResponse.json({ error: "Category is required" }, { status: 400 });
        }

        const now = new Date();
        const id = uuid();
        let slug = name.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

        const existingSlug = await db.query.products.findFirst({ where: eq(products.slug, slug) });
        if (existingSlug) {
            slug = `${slug}-${uuid().slice(0, 4)}`;
        }

        // Vendors can create as draft or submit for review
        const initialStatus = requestedStatus === PRODUCT_STATUS.PENDING_REVIEW 
            ? PRODUCT_STATUS.PENDING_REVIEW 
            : PRODUCT_STATUS.DRAFT;

        const newProduct = {
            id,
            vendorId: vendor.id,
            categoryId,
            name: name.trim(),
            slug,
            itemCode: `VND-${slug.slice(0, 6).toUpperCase()}`,
            pricePerDay: parseFloat(pricePerDay) || 0,
            unit: unit || "unit",
            description: description || null,
            shortDescription: shortDescription || null,
            thumbnailUrl: thumbnailUrl || null,
            brand: brand || null,
            model: model || null,
            dimensions: dimensions || null,
            weight: weight || null,
            powerRequirements: powerRequirements || null,
            materials: materials || null,
            requiresApproval: true,
            isPublished: false,
            status: initialStatus,
            createdAt: now,
            updatedAt: now,
        };

        await db.transaction(async (tx) => {
            await tx.insert(products).values(newProduct);

            const initialUnitsCount = Math.max(0, Number(totalUnits) || 0);
            for (let u = 0; u < initialUnitsCount; u++) {
                const tagCode = `E3-V${vendor.id.slice(0, 4).toUpperCase()}-${id.slice(0, 4).toUpperCase()}-${String(u + 1).padStart(3, '0')}`;
                await tx.insert(inventoryUnits).values({
                    id: uuid(),
                    productId: id,
                    vendorId: vendor.id,
                    assetTagCode: tagCode,
                    conditionStatus: condition || "excellent",
                    availabilityStatus: "in_warehouse",
                    warehouseLocation: warehouseLocation || "Vendor Warehouse",
                    createdAt: now,
                    updatedAt: now,
                });
            }
        });

        await logProductLifecycleEvent({
            actorId: user.id,
            productId: id,
            fromStatus: "none",
            toStatus: initialStatus,
            role: user.role,
            note: `Vendor listed new item: ${newProduct.name} (${initialStatus})`,
        });

        return NextResponse.json(newProduct, { status: 201 });
    } catch (err: any) {
        console.error("Vendor Product Creation Error:", err);
        return NextResponse.json({ error: "Failed to create product: " + (err.message || "Unknown error") }, { status: 500 });
    }
}

export async function PATCH(req: NextRequest) {
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
        const { id, status: newStatusRequest, ...updates } = body;

        if (!id) {
            return NextResponse.json({ error: "Product ID is required" }, { status: 400 });
        }

        // Verify Ownership
        const [existing] = await db
            .select()
            .from(products)
            .where(and(eq(products.id, id), eq(products.vendorId, vendor.id)))
            .limit(1);

        if (!existing) {
            return NextResponse.json({ error: "Product not found or unauthorized" }, { status: 404 });
        }

        const currentStatus = existing.status || PRODUCT_STATUS.DRAFT;
        let finalStatus = currentStatus;

        if (newStatusRequest) {
            if ([PRODUCT_STATUS.PENDING_REVIEW, PRODUCT_STATUS.DRAFT, PRODUCT_STATUS.UNPUBLISHED].includes(newStatusRequest)) {
                finalStatus = newStatusRequest;
            }
        }

        const updateData: any = {
            ...updates,
            status: finalStatus,
            updatedAt: new Date(),
        };

        if (updates.pricePerDay !== undefined) updateData.pricePerDay = parseFloat(updates.pricePerDay) || 0;

        await db
            .update(products)
            .set(updateData)
            .where(eq(products.id, id));

        if (finalStatus !== currentStatus) {
            await logProductLifecycleEvent({
                actorId: user.id,
                productId: id,
                fromStatus: currentStatus,
                toStatus: finalStatus,
                role: user.role,
                note: `Vendor updated product status to ${finalStatus}`,
            });
        }

        return NextResponse.json({ success: true, id, status: finalStatus });
    } catch (err: any) {
        console.error("Vendor Product Update Error:", err);
        return NextResponse.json({ error: "Failed to update product: " + (err.message || "Unknown error") }, { status: 500 });
    }
}
