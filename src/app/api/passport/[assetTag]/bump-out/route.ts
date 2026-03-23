import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { inventoryUnits, bookingUnitAssignments, bookings, vendors, inspectionLogs } from "@/lib/db/schema";
import { eq, and, ne } from "drizzle-orm";
import { getSession } from "@/lib/auth";
import { USER_ROLES, ASSIGNMENT_STATUS } from "@/lib/constants";
import { v4 as uuidv4 } from "uuid";

export async function POST(
    req: NextRequest,
    { params }: { params: Promise<{ assetTag: string }> }
) {
    const { assetTag } = await params;

    try {
        const session = await getSession();
        if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const body = await req.json();
        const { conditionAfter, notes } = body;

        // 1. Find the unit
        const unit = await db.query.inventoryUnits.findFirst({
            where: eq(inventoryUnits.assetTagCode, assetTag),
        });
        if (!unit) return NextResponse.json({ error: "Unit not found" }, { status: 404 });

        // 2. RBAC
        const vendor = unit.vendorId ? await db.query.vendors.findFirst({ where: eq(vendors.id, unit.vendorId) }) : null;
        const isAuthorized = [USER_ROLES.ADMIN, USER_ROLES.SUPER_ADMIN, USER_ROLES.WAREHOUSE_MANAGER].includes(session.role as any) ||
            (session.role === USER_ROLES.VENDOR && session.id === vendor?.userId);
        if (!isAuthorized) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

        // 3. Find active assignment
        const activeAssignment = await db.query.bookingUnitAssignments.findFirst({
            where: and(
                eq(bookingUnitAssignments.inventoryUnitId, unit.id),
                ne(bookingUnitAssignments.status, ASSIGNMENT_STATUS.RETURNED)
            ),
        });

        if (!activeAssignment) {
            return NextResponse.json({ error: "No active assignment for this unit." }, { status: 400 });
        }

        // 4. Mark assignment as returned
        await db.update(bookingUnitAssignments)
            .set({
                status: ASSIGNMENT_STATUS.RETURNED,
                scannedInAt: new Date(),
            })
            .where(eq(bookingUnitAssignments.id, activeAssignment.id))
            .execute();

        // 5. Restore unit to warehouse
        await db.update(inventoryUnits)
            .set({
                availabilityStatus: "in_warehouse",
                conditionStatus: conditionAfter || unit.conditionStatus,
                updatedAt: new Date(),
            })
            .where(eq(inventoryUnits.id, unit.id))
            .execute();

        // 6. If condition was provided, also log an inspection
        if (conditionAfter && conditionAfter !== unit.conditionStatus) {
            await db.insert(inspectionLogs).values({
                id: uuidv4(),
                unitId: unit.id,
                inspectorId: session.id,
                inspectionType: "return",
                conditionBefore: unit.conditionStatus,
                conditionAfter,
                notes: notes || "Post-return bump-out inspection",
                createdAt: new Date(),
            }).execute();
        }

        return NextResponse.json({ success: true, message: "Asset returned to warehouse." });
    } catch (error) {
        console.error("Bump-Out Error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
