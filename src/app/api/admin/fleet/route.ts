import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { inventoryUnits, products, vendors, users, categories } from "@/lib/db/schema";
import { eq, and, sql } from "drizzle-orm";
import { v4 as uuidv4 } from "uuid";
import { getSession } from "@/lib/auth";

export async function GET(req: NextRequest) {
    const session = await getSession();
    if (!session || !["admin", "super_admin", "vendor", "warehouse_manager"].includes(session.role)) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const { searchParams } = new URL(req.url);
        const productIdFilter = searchParams.get("productId");
        const vendorIdFilter = searchParams.get("vendorId");
        const categoryFilter = searchParams.get("categoryId");

        // Build base query with category info for hierarchical grouping
        let results = await db.select({
            id: inventoryUnits.id,
            productId: inventoryUnits.productId,
            vendorId: inventoryUnits.vendorId,
            assetTagCode: inventoryUnits.assetTagCode,
            serialNumber: inventoryUnits.serialNumber,
            conditionStatus: inventoryUnits.conditionStatus,
            availabilityStatus: inventoryUnits.availabilityStatus,
            lastInspectionDate: inventoryUnits.lastInspectionDate,
            warehouseLocation: inventoryUnits.warehouseLocation,
            productName: products.name,
            vendorName: vendors.companyName,
            categoryId: products.categoryId,
            categoryName: categories.name,
            categorySlug: categories.slug,
        })
        .from(inventoryUnits)
        .leftJoin(products, eq(inventoryUnits.productId, products.id))
        .leftJoin(vendors, eq(inventoryUnits.vendorId, vendors.id))
        .leftJoin(categories, eq(products.categoryId, categories.id))
        .execute();

        // Multi-Tenant Isolation
        if (session.role === "vendor") {
            const vendorRecord = await db.query.vendors.findFirst({
                where: eq(vendors.userId, session.id)
            });
            if (!vendorRecord) return NextResponse.json([], { status: 200 });
            results = results.filter(r => r.vendorId === vendorRecord.id);
        }

        // Apply filters
        if (productIdFilter) {
            results = results.filter(r => r.productId === productIdFilter);
        }
        if (vendorIdFilter && session.role !== "vendor") {
            results = results.filter(r => r.vendorId === vendorIdFilter);
        }
        if (categoryFilter) {
            results = results.filter(r => r.categoryId === categoryFilter);
        }

        return NextResponse.json(results);
    } catch (error) {
        console.error("Fleet API Error:", error);
        return NextResponse.json({ error: "Failed to fetch fleet data" }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    const session = await getSession();
    if (!session || !["admin", "super_admin", "vendor"].includes(session.role)) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const body = await req.json();
        const { productId, serialNumber, assetTagCode, warehouseLocation, conditionStatus } = body;

        // Determine Vendor ID
        let vendorIdToUse = body.vendorId;
        if (session.role === "vendor") {
            const vendorRecord = await db.query.vendors.findFirst({
                where: eq(vendors.userId, session.id)
            });
            if (!vendorRecord) return NextResponse.json({ error: "Vendor profile not found" }, { status: 400 });
            vendorIdToUse = vendorRecord.id;
        }

        if (!productId || !vendorIdToUse) {
            return NextResponse.json({ error: "productId and vendorId are required" }, { status: 400 });
        }

        const newUnit = await db.insert(inventoryUnits).values({
            id: uuidv4(),
            productId,
            vendorId: vendorIdToUse,
            assetTagCode: assetTagCode || `E3-${Math.random().toString(36).substring(2, 7).toUpperCase()}-${String(Date.now()).slice(-3)}`,
            serialNumber: serialNumber || null,
            warehouseLocation: warehouseLocation || null,
            conditionStatus: conditionStatus || "excellent",
            availabilityStatus: "in_warehouse",
            createdAt: new Date(),
            updatedAt: new Date(),
        }).returning();

        return NextResponse.json(newUnit[0], { status: 201 });
    } catch (error: any) {
        console.error("Fleet Creation Error:", error);
        if (error.code === "23505") {
            return NextResponse.json({ error: "Asset tag code already exists. Please use a unique code." }, { status: 409 });
        }
        return NextResponse.json({ error: "Failed to create unit" }, { status: 500 });
    }
}

export async function PATCH(req: NextRequest) {
    const session = await getSession();
    if (!session || !["admin", "super_admin", "vendor", "warehouse_manager"].includes(session.role)) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const body = await req.json();
        const { id, ...updates } = body;

        if (!id) {
            return NextResponse.json({ error: "Unit ID required" }, { status: 400 });
        }

        // Only allow specific fields to be updated
        const allowedFields: Record<string, any> = {};
        if (updates.conditionStatus) allowedFields.conditionStatus = updates.conditionStatus;
        if (updates.availabilityStatus) allowedFields.availabilityStatus = updates.availabilityStatus;
        if (updates.warehouseLocation !== undefined) allowedFields.warehouseLocation = updates.warehouseLocation;
        if (updates.lastInspectionDate) allowedFields.lastInspectionDate = new Date(updates.lastInspectionDate);
        if (updates.serialNumber !== undefined) allowedFields.serialNumber = updates.serialNumber;

        const updated = await db.update(inventoryUnits)
            .set({ 
                ...allowedFields, 
                updatedAt: new Date() 
            })
            .where(eq(inventoryUnits.id, id))
            .returning();

        return NextResponse.json(updated[0]);
    } catch (error) {
        return NextResponse.json({ error: "Update failed" }, { status: 500 });
    }
}
