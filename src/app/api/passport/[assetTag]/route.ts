import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { inventoryUnits, products, vendors, inspectionLogs } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";
import { getSession } from "@/lib/auth";
import { USER_ROLES } from "@/lib/constants";

export async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ assetTag: string }> }
) {
    const { assetTag } = await params;

    try {
        // 1. Fetch Asset & Product Data
        const asset = await db.select({
            id: inventoryUnits.id,
            assetTagCode: inventoryUnits.assetTagCode,
            productId: inventoryUnits.productId,
            vendorId: inventoryUnits.vendorId,
            conditionStatus: inventoryUnits.conditionStatus,
            availabilityStatus: inventoryUnits.availabilityStatus,
            lastInspectionDate: inventoryUnits.lastInspectionDate,
            warehouseLocation: inventoryUnits.warehouseLocation,
            serialNumber: inventoryUnits.serialNumber,
            productName: products.name,
            productThumbnail: products.thumbnailUrl,
            vendorName: vendors.companyName
        })
        .from(inventoryUnits)
        .where(eq(inventoryUnits.assetTagCode, assetTag))
        .leftJoin(products, eq(inventoryUnits.productId, products.id))
        .leftJoin(vendors, eq(inventoryUnits.vendorId, vendors.id))
        .limit(1)
        .execute();

        if (asset.length === 0) {
            return NextResponse.json({ error: "Asset not found" }, { status: 404 });
        }

        // 2. Check Authorization for Operations Panel
        const session = await getSession();
        const isAuthorized = session && (
            [USER_ROLES.ADMIN, USER_ROLES.SUPER_ADMIN].includes(session.role as any) || 
            (session.role === USER_ROLES.VENDOR && session.id === (await db.query.vendors.findFirst({ where: eq(vendors.id, asset[0].vendorId) }))?.userId) ||
            session.role === USER_ROLES.WAREHOUSE_MANAGER
        );
        
        // 3. Fetch History (Inspection Logs)
        const history = await db.select({
            id: inspectionLogs.id,
            date: inspectionLogs.createdAt,
            inspectionType: inspectionLogs.inspectionType,
            conditionBefore: inspectionLogs.conditionBefore,
            conditionAfter: inspectionLogs.conditionAfter,
            notes: inspectionLogs.notes,
        })
        .from(inspectionLogs)
        .where(eq(inspectionLogs.unitId, asset[0].id))
        .orderBy(desc(inspectionLogs.createdAt))
        .execute();

        return NextResponse.json({
            ...asset[0],
            isAuthorized: !!isAuthorized,
            history: history || []
        });
    } catch (error) {
        console.error("Passport API Error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
