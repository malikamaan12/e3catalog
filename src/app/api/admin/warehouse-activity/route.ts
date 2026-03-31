import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import {
    inspectionLogs, bookingUnitAssignments,
    inventoryUnits, bookings, users
} from "@/lib/db/schema";
import { eq, desc, sql } from "drizzle-orm";
import { requireAdmin } from "@/lib/requireAdmin";
import { USER_ROLES } from "@/lib/constants";

/**
 * GET /api/admin/warehouse-activity
 * Returns a merged activity feed of recent inspections and scan events.
 */
export async function GET(req: NextRequest) {
    const { user, error } = await requireAdmin([
        USER_ROLES.ADMIN,
        USER_ROLES.SUPER_ADMIN,
        USER_ROLES.WAREHOUSE_MANAGER,
        USER_ROLES.VENDOR,
    ]);
    if (error) return error;

    try {
        const { searchParams } = new URL(req.url);
        const limit = parseInt(searchParams.get("limit") || "20");

        // 1. Recent Inspections
        const recentInspections = await db
            .select({
                id: inspectionLogs.id,
                type: sql<string>`'inspection'`,
                assetTag: inventoryUnits.assetTagCode,
                detail: inspectionLogs.inspectionType,
                conditionBefore: inspectionLogs.conditionBefore,
                conditionAfter: inspectionLogs.conditionAfter,
                notes: inspectionLogs.notes,
                actorName: users.name,
                timestamp: inspectionLogs.createdAt,
            })
            .from(inspectionLogs)
            .leftJoin(inventoryUnits, eq(inspectionLogs.unitId, inventoryUnits.id))
            .leftJoin(users, eq(inspectionLogs.inspectorId, users.id))
            .orderBy(desc(inspectionLogs.createdAt))
            .limit(limit);

        // 2. Recent Scan Events (dispatched / returned)
        const recentScans = await db
            .select({
                id: bookingUnitAssignments.id,
                type: sql<string>`'scan'`,
                assetTag: inventoryUnits.assetTagCode,
                detail: bookingUnitAssignments.status,
                projectName: bookings.projectName,
                customerName: bookings.customerName,
                scannedOutAt: bookingUnitAssignments.scannedOutAt,
                scannedInAt: bookingUnitAssignments.scannedInAt,
                timestamp: bookingUnitAssignments.assignedAt,
            })
            .from(bookingUnitAssignments)
            .leftJoin(inventoryUnits, eq(bookingUnitAssignments.inventoryUnitId, inventoryUnits.id))
            .leftJoin(bookings, eq(bookingUnitAssignments.bookingId, bookings.id))
            .orderBy(desc(bookingUnitAssignments.assignedAt))
            .limit(limit);

        // Merge and sort
        const merged = [
            ...recentInspections.map(i => ({
                id: i.id,
                eventType: "inspection" as const,
                assetTag: i.assetTag,
                detail: i.detail,
                conditionBefore: i.conditionBefore,
                conditionAfter: i.conditionAfter,
                notes: i.notes,
                actor: i.actorName,
                timestamp: i.timestamp,
            })),
            ...recentScans.map(s => ({
                id: s.id,
                eventType: "scan" as const,
                assetTag: s.assetTag,
                detail: s.detail === "dispatched" ? "dispatched" : "returned",
                projectName: s.projectName,
                customerName: s.customerName,
                timestamp: s.scannedOutAt || s.scannedInAt || s.timestamp,
            })),
        ]
        .sort((a, b) => new Date(b.timestamp!).getTime() - new Date(a.timestamp!).getTime())
        .slice(0, limit);

        return NextResponse.json(merged);
    } catch (err) {
        console.error("Warehouse Activity Error:", err);
        return NextResponse.json({ error: "Failed to load activity" }, { status: 500 });
    }
}
