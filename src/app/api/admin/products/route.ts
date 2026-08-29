import { db } from "@/lib/db";
import { 
    products, 
    categories, 
    productMedia, 
    safetyCertificates, 
    installationGuides, 
    productDocuments, 
    inventoryUnits,
    bookings,
    vendors
} from "@/lib/db/schema";
import { eq, and, or, ilike, desc, asc, sql, inArray } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { v4 as uuid } from "uuid";
import { requireAdmin } from "@/lib/requireAdmin";
import { USER_ROLES, PRODUCT_STATUS } from "@/lib/constants";
import { logProductLifecycleEvent, isValidProductTransition, canRoleTransitionProduct } from "@/lib/product-lifecycle";
import { isUnitAllocatable } from "@/lib/availability";

export async function GET(req: NextRequest) {
    try {
        const { user, error } = await requireAdmin([
            USER_ROLES.SUPER_ADMIN, 
            USER_ROLES.ADMIN, 
            USER_ROLES.VENDOR, 
            USER_ROLES.SALES_REP, 
            USER_ROLES.WAREHOUSE_MANAGER
        ]);
        if (error) return error;

        const isSuperAdmin = user.role === USER_ROLES.SUPER_ADMIN || user.role === USER_ROLES.ADMIN;
        const targetVendorId = isSuperAdmin ? null : (user as any).vendorId;

        const { searchParams } = new URL(req.url);
        const search = searchParams.get("search")?.trim() || "";
        const categoryId = searchParams.get("categoryId") || "";
        const vendorId = searchParams.get("vendorId") || "";
        const statusFilter = searchParams.get("status") || "";
        const page = Math.max(1, Number(searchParams.get("page")) || 1);
        const limit = Math.min(100, Math.max(1, Number(searchParams.get("limit")) || 50));
        const offset = (page - 1) * limit;

        const whereConditions: any[] = [];

        // Tenant Isolation
        if (!isSuperAdmin) {
            if (!targetVendorId) {
                return NextResponse.json({ error: "No vendor context assigned." }, { status: 403 });
            }
            whereConditions.push(eq(products.vendorId, targetVendorId));
        } else if (vendorId && vendorId !== "ALL") {
            whereConditions.push(eq(products.vendorId, vendorId));
        }

        if (search) {
            whereConditions.push(
                or(
                    ilike(products.name, `%${search}%`),
                    ilike(products.slug, `%${search}%`),
                    ilike(products.itemCode, `%${search}%`)
                )
            );
        }

        if (categoryId && categoryId !== "ALL") {
            whereConditions.push(eq(products.categoryId, categoryId));
        }

        if (statusFilter && statusFilter !== "ALL") {
            whereConditions.push(eq(products.status, statusFilter));
        }

        const combinedWhere = whereConditions.length > 0 ? and(...whereConditions) : undefined;

        const result = await db.query.products.findMany({
            where: combinedWhere,
            with: {
                category: { columns: { id: true, name: true, slug: true } },
                vendor: { columns: { id: true, companyName: true } },
                media: { orderBy: (media, { asc }) => [asc(media.sortOrder)] },
                documents: true,
                safetyCertificates: true,
                installationGuides: true,
                inventoryUnits: { 
                    columns: { 
                        id: true, 
                        assetTagCode: true, 
                        conditionStatus: true, 
                        availabilityStatus: true 
                    } 
                },
            },
            orderBy: [desc(products.createdAt)],
            limit,
            offset,
        });

        const productsWithMetrics = result.map(p => {
            const units = p.inventoryUnits || [];
            const allocatable = units.filter(isUnitAllocatable).length;
            const offline = units.length - allocatable;

            return {
                ...p,
                totalUnits: units.length,
                allocatableUnits: allocatable,
                offlineUnits: offline,
            };
        });

        return NextResponse.json(productsWithMetrics);
    } catch (err: any) {
        console.error("[ADMIN_PRODUCTS_GET] Error:", err);
        return NextResponse.json({ error: "Failed to fetch products" }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    try {
        const { user, error } = await requireAdmin([
            USER_ROLES.SUPER_ADMIN, 
            USER_ROLES.ADMIN, 
            USER_ROLES.VENDOR
        ]);
        if (error) return error;

        const isSuperAdmin = user.role === USER_ROLES.SUPER_ADMIN || user.role === USER_ROLES.ADMIN;
        const targetVendorId = isSuperAdmin ? null : (user as any).vendorId;

        const body = await req.json();
        const now = new Date();

        if (!body.name?.trim()) {
            return NextResponse.json({ error: "Product name is required" }, { status: 400 });
        }

        if (!body.categoryId) {
            return NextResponse.json({ error: "Category is required" }, { status: 400 });
        }

        // Assigned vendor resolution
        let assignedVendorId: string | null = null;
        if (!isSuperAdmin) {
            assignedVendorId = targetVendorId;
        } else {
            assignedVendorId = body.vendorId || null;
        }

        // Slug generation
        let slug = (body.slug || body.name)
            .toLowerCase()
            .trim()
            .replace(/[^a-z0-9]+/g, "-")
            .replace(/(^-|-$)/g, "");

        // Check duplicate slug
        const existingSlug = await db.query.products.findFirst({
            where: eq(products.slug, slug),
        });
        if (existingSlug) {
            slug = `${slug}-${uuid().slice(0, 4)}`;
        }

        // Determine initial status based on role and payload
        let initialStatus = body.status || PRODUCT_STATUS.DRAFT;
        if (!isSuperAdmin && initialStatus === PRODUCT_STATUS.PUBLISHED) {
            initialStatus = PRODUCT_STATUS.PENDING_REVIEW;
        }

        const isPublished = initialStatus === PRODUCT_STATUS.PUBLISHED;
        const productId = uuid();

        const newProduct = {
            id: productId,
            vendorId: assignedVendorId,
            categoryId: body.categoryId,
            name: body.name.trim(),
            slug,
            itemCode: body.itemCode?.trim() || `SKU-${slug.slice(0, 6).toUpperCase()}`,
            shortDescription: body.shortDescription || null,
            description: body.description || null,
            brand: body.brand || null,
            model: body.model || null,
            dimensions: body.dimensions || null,
            weight: body.weight || null,
            powerRequirements: body.powerRequirements || null,
            materials: body.materials || null,
            showPrice: typeof body.showPrice === 'boolean' ? body.showPrice : true,
            priceType: body.priceType || 'daily',
            priceRangeMax: body.priceRangeMax ? Number(body.priceRangeMax) : null,
            pricePerDay: Number(body.pricePerDay) || 0,
            pricePerHour: body.pricePerHour ? Number(body.pricePerHour) : null,
            replacementValue: body.replacementValue ? Number(body.replacementValue) : null,
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
            requiresApproval: initialStatus === PRODUCT_STATUS.PENDING_REVIEW,
            isPublished,
            status: initialStatus,
            metaTitle: body.metaTitle || body.name,
            metaDescription: body.metaDescription || body.shortDescription || null,
            keywords: body.keywords || null,
            adminNotes: body.adminNotes || null,
            createdAt: now,
            updatedAt: now,
        };

        // Transactional creation of product + initial inventory units + media + docs
        await db.transaction(async (tx) => {
            await tx.insert(products).values(newProduct);

            // Create initial physical inventory units
            const totalUnits = Math.max(0, Number(body.totalUnits) || 0);
            const unitCondition = body.condition || "excellent";
            
            let vendorForUnits = assignedVendorId;
            if (!vendorForUnits) {
                const firstVendor = await tx.query.vendors.findFirst();
                if (firstVendor) {
                    vendorForUnits = firstVendor.id;
                } else {
                    const fallbackVendorId = uuid();
                    await tx.insert(vendors).values({
                        id: fallbackVendorId,
                        userId: user.id,
                        companyName: "E3 Platform Fleet",
                        storeStatus: "active",
                    });
                    vendorForUnits = fallbackVendorId;
                }
            }

            for (let u = 0; u < totalUnits; u++) {
                const tagCode = `E3-${(newProduct.itemCode || productId.slice(0, 6)).toUpperCase()}-${String(u + 1).padStart(3, '0')}`;
                await tx.insert(inventoryUnits).values({
                    id: uuid(),
                    productId,
                    vendorId: vendorForUnits,
                    assetTagCode: tagCode,
                    conditionStatus: unitCondition,
                    availabilityStatus: "in_warehouse",
                    warehouseLocation: body.warehouseLocation || "Main Warehouse",
                    createdAt: now,
                    updatedAt: now,
                });
            }

            // Insert media
            if (body.media && Array.isArray(body.media) && body.media.length > 0) {
                for (let idx = 0; idx < body.media.length; idx++) {
                    const m = body.media[idx];
                    await tx.insert(productMedia).values({
                        id: uuid(),
                        productId,
                        type: m.type || "image",
                        url: m.url,
                        thumbnailUrl: m.thumbnailUrl || null,
                        alt: m.alt || newProduct.name,
                        sortOrder: m.sortOrder ?? idx,
                    });
                }
            }

            // Insert documents
            if (body.documents && Array.isArray(body.documents) && body.documents.length > 0) {
                for (const doc of body.documents) {
                    await tx.insert(productDocuments).values({
                        id: uuid(),
                        productId,
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
                    await tx.insert(safetyCertificates).values({
                        id: uuid(),
                        productId,
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
                    await tx.insert(installationGuides).values({
                        id: uuid(),
                        productId,
                        guideType: guide.guideType || "install",
                        content: guide.content,
                        requiredManpower: guide.requiredManpower || null,
                        estimatedTime: guide.estimatedTime || null,
                        toolsRequired: guide.toolsRequired || null,
                    });
                }
            }
        });

        // Audit Log
        await logProductLifecycleEvent({
            actorId: user.id,
            productId,
            fromStatus: "none",
            toStatus: initialStatus,
            role: user.role,
            note: `Product created: ${newProduct.name} (${newProduct.status})`,
        });

        return NextResponse.json(newProduct, { status: 201 });
    } catch (err: any) {
        console.error("[ADMIN_PRODUCTS_POST] Error:", err);
        return NextResponse.json({ error: "Failed to create product: " + (err.message || "Unknown error") }, { status: 500 });
    }
}

export async function PUT(req: NextRequest) {
    try {
        const { user, error } = await requireAdmin([
            USER_ROLES.SUPER_ADMIN, 
            USER_ROLES.ADMIN, 
            USER_ROLES.VENDOR
        ]);
        if (error) return error;

        const isSuperAdmin = user.role === USER_ROLES.SUPER_ADMIN || user.role === USER_ROLES.ADMIN;
        const targetVendorId = isSuperAdmin ? null : (user as any).vendorId;

        const body = await req.json();
        const { 
            id, 
            media, 
            documents, 
            certificates: certificatesInput, 
            installationGuides: installationGuidesInput, 
            totalUnits, 
            warehouseLocation,
            ...updates 
        } = body;

        if (!id) {
            return NextResponse.json({ error: "Product ID is required" }, { status: 400 });
        }

        // Fetch existing product
        const existing = await db.query.products.findFirst({
            where: eq(products.id, id),
        });

        if (!existing) {
            return NextResponse.json({ error: "Product not found" }, { status: 404 });
        }

        // Tenant check for vendors
        if (!isSuperAdmin && existing.vendorId !== targetVendorId) {
            return NextResponse.json({ error: "Forbidden: You do not own this product." }, { status: 403 });
        }

        // Lifecycle transition validation
        const currentStatus = existing.status || (existing.isPublished ? PRODUCT_STATUS.PUBLISHED : PRODUCT_STATUS.DRAFT);
        let newStatus = updates.status || currentStatus;

        if (updates.isPublished !== undefined) {
            newStatus = updates.isPublished ? PRODUCT_STATUS.PUBLISHED : PRODUCT_STATUS.UNPUBLISHED;
        }

        if (newStatus !== currentStatus) {
            if (!canRoleTransitionProduct(user.role, currentStatus, newStatus)) {
                return NextResponse.json({ error: `Unauthorized transition from ${currentStatus} to ${newStatus}` }, { status: 403 });
            }
        }

        const now = new Date();
        const productUpdates: any = {
            ...updates,
            status: newStatus,
            isPublished: newStatus === PRODUCT_STATUS.PUBLISHED,
            updatedAt: now,
        };

        delete productUpdates.id;
        delete productUpdates.createdAt;

        // Clean numeric types
        if (productUpdates.pricePerDay !== undefined) productUpdates.pricePerDay = Number(productUpdates.pricePerDay) || 0;
        if (productUpdates.pricePerHour !== undefined) productUpdates.pricePerHour = productUpdates.pricePerHour ? Number(productUpdates.pricePerHour) : null;
        if (productUpdates.packagingFee !== undefined) productUpdates.packagingFee = Number(productUpdates.packagingFee) || 0;
        if (productUpdates.handlingFee !== undefined) productUpdates.handlingFee = Number(productUpdates.handlingFee) || 0;
        if (productUpdates.setupFee !== undefined) productUpdates.setupFee = Number(productUpdates.setupFee) || 0;

        await db.transaction(async (tx) => {
            await tx.update(products).set(productUpdates).where(eq(products.id, id));

            // Update Media
            if (media && Array.isArray(media)) {
                await tx.delete(productMedia).where(eq(productMedia.productId, id));
                for (let i = 0; i < media.length; i++) {
                    const m = media[i];
                    await tx.insert(productMedia).values({
                        id: uuid(),
                        productId: id,
                        type: m.type || "image",
                        url: m.url,
                        thumbnailUrl: m.thumbnailUrl || null,
                        alt: m.alt || null,
                        sortOrder: m.sortOrder ?? i,
                    });
                }
            }

            // Update Documents
            if (documents && Array.isArray(documents)) {
                await tx.delete(productDocuments).where(eq(productDocuments.productId, id));
                for (const doc of documents) {
                    await tx.insert(productDocuments).values({
                        id: uuid(),
                        productId: id,
                        name: doc.originalName || doc.name || "Document",
                        url: doc.url,
                        type: doc.type || "document",
                        size: doc.size || 0,
                        uploadedAt: now,
                    });
                }
            }

            // Update Certificates
            if (certificatesInput && Array.isArray(certificatesInput)) {
                await tx.delete(safetyCertificates).where(eq(safetyCertificates.productId, id));
                for (const cert of certificatesInput) {
                    if (!cert.certName || !cert.issueDate || !cert.expiryDate) continue;
                    await tx.insert(safetyCertificates).values({
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

            // Update Guides
            if (installationGuidesInput && Array.isArray(installationGuidesInput)) {
                await tx.delete(installationGuides).where(eq(installationGuides.productId, id));
                for (const guide of installationGuidesInput) {
                    if (!guide.content) continue;
                    await tx.insert(installationGuides).values({
                        id: uuid(),
                        productId: id,
                        guideType: guide.guideType || "install",
                        content: guide.content,
                        requiredManpower: guide.requiredManpower || null,
                        estimatedTime: guide.estimatedTime || null,
                        toolsRequired: guide.toolsRequired || null,
                    });
                }
            }
        });

        // Audit Log on status change
        if (newStatus !== currentStatus) {
            await logProductLifecycleEvent({
                actorId: user.id,
                productId: id,
                fromStatus: currentStatus,
                toStatus: newStatus,
                role: user.role,
                note: `Product status updated to ${newStatus}`,
            });
        }

        return NextResponse.json({ success: true, id, status: newStatus });
    } catch (err: any) {
        console.error("[ADMIN_PRODUCTS_PUT] Error:", err);
        return NextResponse.json({ error: "Failed to update product: " + (err.message || "Unknown error") }, { status: 500 });
    }
}

export async function DELETE(req: NextRequest) {
    try {
        const { user, error } = await requireAdmin([
            USER_ROLES.SUPER_ADMIN, 
            USER_ROLES.ADMIN, 
            USER_ROLES.VENDOR
        ]);
        if (error) return error;

        const isSuperAdmin = user.role === USER_ROLES.SUPER_ADMIN || user.role === USER_ROLES.ADMIN;
        const targetVendorId = isSuperAdmin ? null : (user as any).vendorId;

        const { searchParams } = new URL(req.url);
        const id = searchParams.get("id");

        if (!id) {
            return NextResponse.json({ error: "Product ID required" }, { status: 400 });
        }

        const existing = await db.query.products.findFirst({
            where: eq(products.id, id),
        });

        if (!existing) {
            return NextResponse.json({ error: "Product not found" }, { status: 404 });
        }

        if (!isSuperAdmin && existing.vendorId !== targetVendorId) {
            return NextResponse.json({ error: "Forbidden: Not authorized to delete this product." }, { status: 403 });
        }

        // Check if product is attached to existing bookings/quotes
        const attachedBookings = await db.query.bookings.findMany({
            where: eq(bookings.productId, id),
            limit: 1,
        });

        if (attachedBookings.length > 0) {
            // Soft Archive: Set status = archived and unpublish so existing historical quotes/bookings work seamlessly
            await db.update(products)
                .set({ 
                    status: PRODUCT_STATUS.ARCHIVED, 
                    isPublished: false, 
                    updatedAt: new Date() 
                })
                .where(eq(products.id, id));

            await logProductLifecycleEvent({
                actorId: user.id,
                productId: id,
                fromStatus: existing.status || "active",
                toStatus: PRODUCT_STATUS.ARCHIVED,
                role: user.role,
                note: "Product soft-archived to protect historical booking records.",
            });

            return NextResponse.json({ 
                success: true, 
                archived: true, 
                message: "Product soft-archived because historical booking records exist." 
            });
        }

        // If no bookings exist, perform safe cascade deletion of children and product
        await db.transaction(async (tx) => {
            await tx.delete(productMedia).where(eq(productMedia.productId, id));
            await tx.delete(productDocuments).where(eq(productDocuments.productId, id));
            await tx.delete(safetyCertificates).where(eq(safetyCertificates.productId, id));
            await tx.delete(installationGuides).where(eq(installationGuides.productId, id));
            await tx.delete(inventoryUnits).where(eq(inventoryUnits.productId, id));
            await tx.delete(products).where(eq(products.id, id));
        });

        await logProductLifecycleEvent({
            actorId: user.id,
            productId: id,
            fromStatus: existing.status || "active",
            toStatus: "deleted",
            role: user.role,
            note: "Unused product draft deleted.",
        });

        return NextResponse.json({ success: true, deleted: true });
    } catch (err: any) {
        console.error("[ADMIN_PRODUCTS_DELETE] Error:", err);
        return NextResponse.json({ error: "Failed to delete product: " + (err.message || "Unknown error") }, { status: 500 });
    }
}
