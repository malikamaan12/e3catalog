import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { inventoryUnits, products, vendors, inspectionLogs, bookingUnitAssignments, bookings, vendorWarehouses } from "@/lib/db/schema";
import { eq, desc, and, ne } from "drizzle-orm";
import { getSession } from "@/lib/auth";
import { USER_ROLES, ASSIGNMENT_STATUS } from "@/lib/constants";

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
            shelfLocation: inventoryUnits.shelfLocation,
            serialNumber: inventoryUnits.serialNumber,
            productName: products.name,
            productThumbnail: products.thumbnailUrl,
            vendorName: vendors.companyName,
            warehouseName: vendorWarehouses.name,
            warehouseAddress: vendorWarehouses.address,
        })
        .from(inventoryUnits)
        .where(eq(inventoryUnits.assetTagCode, assetTag))
        .leftJoin(products, eq(inventoryUnits.productId, products.id))
        .leftJoin(vendors, eq(inventoryUnits.vendorId, vendors.id))
        .leftJoin(vendorWarehouses, eq(inventoryUnits.warehouseId, vendorWarehouses.id))
        .limit(1)
        .execute();

        if (asset.length === 0) {
            return NextResponse.json({ error: "Asset not found" }, { status: 404 });
        }

        const assetId = asset[0].id;

        // 2. Check Authorization for Operations Panel
        const session = await getSession();
        const vendorProfile = asset[0].vendorId ? await db.query.vendors.findFirst({ where: eq(vendors.id, asset[0].vendorId) }) : null;
        const isAuthorized = session && (
            [USER_ROLES.ADMIN, USER_ROLES.SUPER_ADMIN, USER_ROLES.WAREHOUSE_MANAGER].includes(session.role as any) || 
            (session.role === USER_ROLES.VENDOR && session.id === vendorProfile?.userId)
        );
        
        // 3. Current Project Assignment
        const currentAssignment = await db.select({
            id: bookingUnitAssignments.id,
            bookingId: bookings.id,
            projectName: bookings.projectName,
            customerName: bookings.customerName,
            startDate: bookings.startDate,
            endDate: bookings.endDate,
            assignmentStatus: bookingUnitAssignments.status,
            assignedAt: bookingUnitAssignments.assignedAt,
        })
        .from(bookingUnitAssignments)
        .where(and(
            eq(bookingUnitAssignments.inventoryUnitId, assetId),
            ne(bookingUnitAssignments.status, "returned")
        ))
        .leftJoin(bookings, eq(bookingUnitAssignments.bookingId, bookings.id))
        .limit(1)
        .execute();

        // 4. Fetch Condition History (Inspection Logs)
        const conditionHistory = await db.select({
            id: inspectionLogs.id,
            date: inspectionLogs.createdAt,
            type: inspectionLogs.inspectionType,
            conditionBefore: inspectionLogs.conditionBefore,
            conditionAfter: inspectionLogs.conditionAfter,
            notes: inspectionLogs.notes,
        })
        .from(inspectionLogs)
        .where(eq(inspectionLogs.unitId, assetId))
        .orderBy(desc(inspectionLogs.createdAt))
        .execute();

        // 5. Fetch Deployment History (Past Assignments)
        const assignmentHistory = await db.select({
            id: bookingUnitAssignments.id,
            date: bookingUnitAssignments.assignedAt,
            projectName: bookings.projectName,
            customerName: bookings.customerName,
            status: bookingUnitAssignments.status,
            scannedOutAt: bookingUnitAssignments.scannedOutAt,
            scannedInAt: bookingUnitAssignments.scannedInAt,
        })
        .from(bookingUnitAssignments)
        .where(eq(bookingUnitAssignments.inventoryUnitId, assetId))
        .leftJoin(bookings, eq(bookingUnitAssignments.bookingId, bookings.id))
        .orderBy(desc(bookingUnitAssignments.assignedAt))
        .limit(20)
        .execute();

        // Consolidate history into a unified timeline
        const unifiedHistory = [
            ...conditionHistory.map(h => ({ ...h, historyType: 'condition' })),
            ...assignmentHistory.map(h => ({ ...h, historyType: 'assignment' }))
        ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

        return NextResponse.json({
            ...asset[0],
            isAuthorized: !!isAuthorized,
            currentAssignment: currentAssignment[0] || null,
            history: unifiedHistory
        });
    } catch (error) {
        console.error("Passport API Error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
