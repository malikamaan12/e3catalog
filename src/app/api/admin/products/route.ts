import { db } from "@/lib/db";
import { products, categories, productMedia, safetyCertificates, installationGuides, productDocuments, inventoryUnits } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { v4 as uuid } from "uuid";
import { requireAdmin } from "@/lib/requireAdmin";

export async function GET() {
    const { user, error } = await requireAdmin(["admin", "super_admin", "vendor", "sales_rep", "warehouse_manager"]);
    if (error) return error;

    const isSuperAdmin = user.role === 'super_admin' || user.role === 'admin';
    const targetVendorId = isSuperAdmin ? null : (user as any).vendorId;

    if (!isSuperAdmin && !targetVendorId) {
        return NextResponse.json({ error: "No vendor context assigned." }, { status: 403 });
    }

    const result = await db.query.products.findMany({
        where: targetVendorId ? eq(products.vendorId, targetVendorId) : undefined,
        with: {
            category: { columns: { name: true, slug: true } },
            vendor: { columns: { id: true, companyName: true } },
            media: true,
            safetyCertificates: true,
            inventoryUnits: { columns: { id: true } },
        },
    });

    const productsWithCounts = result.map(p => ({
        ...p,
        totalUnits: (p as any).inventoryUnits?.length || 0
    }));

    return NextResponse.json(productsWithCounts);
}

export async function POST(req: NextRequest) {
    const { user, error } = await requireAdmin(["admin", "super_admin", "vendor"]);
    if (error) return error;

    const isSuperAdmin = user.role === 'super_admin' || user.role === 'admin';
    const targetVendorId = isSuperAdmin ? null : (user as any).vendorId;

    if (!isSuperAdmin && !targetVendorId) {
        return NextResponse.json({ error: "No vendor context assigned." }, { status: 403 });
    }

    const body = await req.json();
    const now = new Date();

    const slug = body.name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)/g, "");

    const product = {
        id: uuid(),
        vendorId: targetVendorId,
        categoryId: body.categoryId,
        name: body.name,
        slug,
        shortDescription: body.shortDescription || null,
        description: body.description || null,
        dimensions: body.dimensions || null,
        weight: body.weight || null,
        powerRequirements: body.powerRequirements || null,
        materials: body.materials || null,
        showPrice: typeof body.showPrice === 'boolean' ? body.showPrice : true,
        priceType: body.priceType || 'daily',
        priceRangeMax: body.priceRangeMax ? Number(body.priceRangeMax) : null,
        pricePerDay: Number(body.pricePerDay),
        pricePerHour: body.pricePerHour ? Number(body.pricePerHour) : null,
        packagingFee: body.packagingFee ? Number(body.packagingFee) : 0,
        handlingFee: body.handlingFee ? Number(body.handlingFee) : 0,
        setupFee: body.setupFee ? Number(body.setupFee) : 0,
        unit: body.unit || "unit",
        minOrderQty: Number(body.minOrderQty) || 1,
        installTime: Number(body.installTime) || 0,
        dismantleTime: Number(body.dismantleTime) || 0,
        cleaningTime: Number(body.cleaningTime) || 0,
        manpower: body.manpower || null,
        tools: body.tools || null,
        thumbnailUrl: body.thumbnailUrl || null,
        featured: body.featured || false,
        requiresLicense: body.requiresLicense || false,
        requiresApproval: body.requiresApproval || false,
        adminNotes: body.adminNotes || null,
        itemCode: body.itemCode?.trim() || null,
        createdAt: now,
        updatedAt: now,
    };

    try {
        await db.insert(products).values(product);

        // Auto-create inventory unit records from totalUnits
        const totalUnits = Number(body.totalUnits) || 1;
        const unitCondition = body.condition || "excellent";
        const vendorForUnits = targetVendorId || body.vendorId || "E3-ENT";
        for (let u = 0; u < totalUnits; u++) {
            const tagCode = `E3-${(product.itemCode || product.id.slice(0, 6)).toUpperCase()}-${String(u + 1).padStart(3, '0')}`;
            await db.insert(inventoryUnits).values({
                id: uuid(),
                productId: product.id,
                vendorId: vendorForUnits,
                assetTagCode: tagCode,
                conditionStatus: unitCondition,
                availabilityStatus: "in_warehouse",
                createdAt: now,
                updatedAt: now,
            });
        }

        // Insert uploaded media records
        if (body.media && Array.isArray(body.media) && body.media.length > 0) {
            for (const m of body.media) {
                await db.insert(productMedia).values({
                    id: uuid(),  // Always fresh UUID — m.id is S3 key, not a safe PK
                    productId: product.id,
                    type: m.type,
                    url: m.url,
                    thumbnailUrl: m.thumbnailUrl || null,
                    alt: m.alt || null,
                    sortOrder: m.sortOrder || 0,
                });
            }
        }

        // Insert uploaded document records
        if (body.documents && Array.isArray(body.documents) && body.documents.length > 0) {
            for (const doc of body.documents) {
                await db.insert(productDocuments).values({
                    id: uuid(),  // Always fresh UUID — doc.id is S3 key, not a safe PK
                    productId: product.id,
                    name: doc.originalName || doc.name || "Document",
                    url: doc.url,
                    type: doc.type || "document",
                    size: doc.size || 0,
                    uploadedAt: now,
                });
            }
        }

        // Insert safety certificates
        if (body.certificates && Array.isArray(body.certificates) && body.certificates.length > 0) {
            for (const cert of body.certificates) {
                if (!cert.certName || !cert.issueDate || !cert.expiryDate) continue;
                await db.insert(safetyCertificates).values({
                    id: uuid(),
                    productId: product.id,
                    certName: cert.certName,
                    certNumber: cert.certNumber || null,
                    issuingBody: cert.issuingBody || null,
                    issueDate: new Date(cert.issueDate),
                    expiryDate: new Date(cert.expiryDate),
                });
            }
        }

        // Insert installation guides
        if (body.installationGuides && Array.isArray(body.installationGuides) && body.installationGuides.length > 0) {
            for (const guide of body.installationGuides) {
                if (!guide.content) continue;
                await db.insert(installationGuides).values({
                    id: uuid(),
                    productId: product.id,
                    guideType: guide.guideType,
                    content: guide.content,
                    requiredManpower: guide.requiredManpower || null,
                    estimatedTime: guide.estimatedTime || null,
                    toolsRequired: guide.toolsRequired || null,
                });
            }
        }

        return NextResponse.json(product, { status: 201 });
    } catch (err: any) {
        console.error("PRODUCT CREATE ERROR (DETAILED):", {
            message: err.message,
            stack: err.stack,
            cause: err.cause,
            code: err.code,
            detail: err.detail
        });
        const errorString = (err.cause?.message || err.message || "").toLowerCase();
        if (errorString.includes("products_slug_unique") || err.code === "23505") {
            return NextResponse.json(
                { error: "A product with this generated slug already exists. Please use a unique product name." },
                { status: 409 }
            );
        }

        return NextResponse.json(
            { error: `Database Error: ${err.detail || err.message || "Unknown DB error"}` },
            { status: 500 }
        );
    }
}

export async function PUT(req: NextRequest) {
    const { user, error } = await requireAdmin(["admin", "super_admin", "vendor"]);
    if (error) return error;

    const body = await req.json();
    const { 
        id, 
        media, 
        documents, 
        certificates: certificatesInput, 
        installationGuides: installationGuidesInput, 
        totalUnits, 
        condition: unitCondition,
        installGuideUrl, 
        dismantleGuideUrl,
        ...updates 
    } = body;

    if (!id) {
        return NextResponse.json({ error: "Product ID required" }, { status: 400 });
    }

    const isSuperAdmin = user.role === 'super_admin' || user.role === 'admin';
    const targetVendorId = isSuperAdmin ? null : (user as any).vendorId;

    if (!isSuperAdmin && !targetVendorId) {
        return NextResponse.json({ error: "No vendor context assigned." }, { status: 403 });
    }

    // Drizzle ORM Type strictness: Convert empty strings to null for numeric fields
    delete updates.createdAt;
    updates.updatedAt = new Date();
    if (updates.minOrderQty) updates.minOrderQty = Number(updates.minOrderQty);
    if (updates.priceRangeMax === "") updates.priceRangeMax = null;
    else if (updates.priceRangeMax !== undefined && updates.priceRangeMax !== null) updates.priceRangeMax = Number(updates.priceRangeMax);
    
    if (updates.pricePerHour === "") updates.pricePerHour = null;
    if (updates.packagingFee === "") updates.packagingFee = 0;
    if (updates.handlingFee === "") updates.handlingFee = 0;
    if (updates.setupFee === "") updates.setupFee = 0;

    const whereClause = targetVendorId
        ? and(eq(products.id, id), eq(products.vendorId, targetVendorId))
        : eq(products.id, id);

    await db.update(products).set(updates).where(whereClause);

    // Reconstruct media relations
    try {
        if (media && Array.isArray(media)) {
            console.log("Updating media relations for product:", id, "Count:", media.length);
            await db.delete(productMedia).where(eq(productMedia.productId, id));
            for (const m of media) {
                const mediaId = m.id && m.id.length > 10 ? m.id : uuid(); // Preserve ID if it looks like a UUID, otherwise generate
                await db.insert(productMedia).values({
                    id: mediaId,
                    productId: id,
                    type: m.type,
                    url: m.url,
                    thumbnailUrl: m.thumbnailUrl || null,
                    alt: m.alt || null,
                    sortOrder: m.sortOrder || 0,
                });
            }
        }
    } catch (mediaErr) {
        console.error("FAILED TO UPDATE PRODUCT MEDIA:", mediaErr);
    }

    // Reconstruct document relations
    if (documents && Array.isArray(documents)) {
        await db.delete(productDocuments).where(eq(productDocuments.productId, id));
        for (const doc of documents) {
            await db.insert(productDocuments).values({
                id: doc.id || uuid(),
                productId: id,
                name: doc.originalName || doc.name || "Document",
                url: doc.url,
                type: doc.type || "document",
                size: doc.size || 0,
                uploadedAt: new Date(),
            });
        }
    }

    // Reconstruct safety certificates
    if (certificatesInput && Array.isArray(certificatesInput)) {
        await db.delete(safetyCertificates).where(eq(safetyCertificates.productId, id));
        for (const cert of certificatesInput) {
            if (!cert.certName || !cert.issueDate || !cert.expiryDate) continue;
            await db.insert(safetyCertificates).values({
                id: uuid(),
                productId: id,
                certName: cert.certName,
                certNumber: cert.certNumber || null,
                issuingBody: cert.issuingBody || null,
                issueDate: new Date(cert.issueDate),
                expiryDate: new Date(cert.expiryDate),
            });
        }
    }

    // Reconstruct installation guides
    if (installationGuidesInput && Array.isArray(installationGuidesInput)) {
        await db.delete(installationGuides).where(eq(installationGuides.productId, id));
        for (const guide of installationGuidesInput) {
            if (!guide.content) continue;
            await db.insert(installationGuides).values({
                id: uuid(),
                productId: id,
                guideType: guide.guideType,
                content: guide.content,
                requiredManpower: guide.requiredManpower || null,
                estimatedTime: guide.estimatedTime || null,
                toolsRequired: guide.toolsRequired || null,
            });
        }
    }

    return NextResponse.json({ success: true });
}

export async function DELETE(req: NextRequest) {
    const { user, error } = await requireAdmin(["admin", "super_admin", "vendor"]);
    if (error) return error;

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
        return NextResponse.json({ error: "Product ID required" }, { status: 400 });
    }

    const isSuperAdmin = user.role === 'super_admin' || user.role === 'admin';
    const targetVendorId = isSuperAdmin ? null : (user as any).vendorId;

    if (!isSuperAdmin && !targetVendorId) {
        return NextResponse.json({ error: "No vendor context assigned." }, { status: 403 });
    }

    // Verify ownership before deleting
    if (!isSuperAdmin) {
        const prod = await db.query.products.findFirst({
            where: and(eq(products.id, id), eq(products.vendorId, targetVendorId))
        });
        if (!prod) {
            return NextResponse.json({ error: "Not authorized to delete this product" }, { status: 403 });
        }
    }

    // Delete related data first (order matters — must delete children before parent)
    await db.delete(productMedia).where(eq(productMedia.productId, id));
    await db.delete(productDocuments).where(eq(productDocuments.productId, id));
    await db.delete(safetyCertificates).where(eq(safetyCertificates.productId, id));
    await db.delete(installationGuides).where(eq(installationGuides.productId, id));
    await db.delete(inventoryUnits).where(eq(inventoryUnits.productId, id));
    await db.delete(products).where(eq(products.id, id));

    return NextResponse.json({ success: true });
}
