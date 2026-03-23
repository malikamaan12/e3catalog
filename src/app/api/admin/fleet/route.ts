import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { inventoryUnits, products, vendors, users } from "@/lib/db/schema";
import { eq, and, or, sql } from "drizzle-orm";
import { v4 as uuidv4 } from "uuid";
import { getSession } from "@/lib/auth";

export async function GET(req: NextRequest) {
    // 1. Auth & RBAC
    const session = await getSession();
    if (!session || !["admin", "super_admin", "vendor"].includes(session.role)) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const { searchParams } = new URL(req.url);
        const productId = searchParams.get("productId");
        
        // 2. Query Builder
        let query = db.select({
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
            vendorName: vendors.companyName
        })
        .from(inventoryUnits)
        .leftJoin(products, eq(inventoryUnits.productId, products.id))
        .leftJoin(vendors, eq(inventoryUnits.vendorId, vendors.id));

        // 3. Multi-Tenant Isolation
        if (session.role === "vendor") {
            // Find the vendor ID associated with this user
            const vendorRecord = await db.query.vendors.findFirst({
                where: eq(vendors.userId, session.id)
            });
            if (!vendorRecord) return NextResponse.json([], { status: 200 });
            
            // Filter by vendorId
            query = query.where(eq(inventoryUnits.vendorId, vendorRecord.id)) as any;
        }

        const results = await query.execute();
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
        const { productId, serialNumber, assetTagCode, warehouseLocation } = body;

        // Determine Vendor ID
        let vendorIdToUse = body.vendorId;
        if (session.role === "vendor") {
            const vendorRecord = await db.query.vendors.findFirst({
                where: eq(vendors.userId, session.id)
            });
            if (!vendorRecord) return NextResponse.json({ error: "Vendor profile not found" }, { status: 400 });
            vendorIdToUse = vendorRecord.id;
        }

        const newUnit = await db.insert(inventoryUnits).values({
            id: uuidv4(),
            productId,
            vendorId: vendorIdToUse,
            assetTagCode: assetTagCode || `E3-${Math.random().toString(36).substring(2, 7).toUpperCase()}`,
            serialNumber,
            warehouseLocation,
            conditionStatus: "excellent",
            availabilityStatus: "in_warehouse",
            createdAt: new Date(),
            updatedAt: new Date(),
        }).returning();

        return NextResponse.json(newUnit[0]);
    } catch (error) {
        console.error("Fleet Creation Error:", error);
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

        const updated = await db.update(inventoryUnits)
            .set({ 
                ...updates, 
                updatedAt: new Date() 
            })
            .where(eq(inventoryUnits.id, id))
            .returning();

        return NextResponse.json(updated[0]);
    } catch (error) {
        return NextResponse.json({ error: "Update failed" }, { status: 500 });
    }
}
