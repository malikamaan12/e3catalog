import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { inventoryUnits, bookingUnitAssignments, bookings, vendors } from "@/lib/db/schema";
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
        const { bookingId } = body;

        if (!bookingId) return NextResponse.json({ error: "Missing bookingId" }, { status: 400 });

        // 1. Verify unit and ownership
        const unit = await db.query.inventoryUnits.findFirst({
            where: eq(inventoryUnits.assetTagCode, assetTag),
        });

        if (!unit) return NextResponse.json({ error: "Unit not found" }, { status: 404 });

        // Vendor RBAC check
        const vendor = unit.vendorId ? await db.query.vendors.findFirst({ where: eq(vendors.id, unit.vendorId) }) : null;
        const isAuthorized = session.role === USER_ROLES.ADMIN || 
                           session.role === USER_ROLES.SUPER_ADMIN || 
                           (session.role === USER_ROLES.VENDOR && session.id === vendor?.userId);

        if (!isAuthorized) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

        // 2. Check if unit is already assigned and not returned
        const existing = await db.query.bookingUnitAssignments.findFirst({
            where: and(
                eq(bookingUnitAssignments.inventoryUnitId, unit.id),
                ne(bookingUnitAssignments.status, ASSIGNMENT_STATUS.RETURNED)
            ),
        });

        if (existing) {
            return NextResponse.json({ 
                error: "Asset is already assigned to another project.", 
                currentBookingId: existing.bookingId 
            }, { status: 400 });
        }

        // 3. Create Assignment
        const newAssignment = {
            id: uuidv4(),
            bookingId: bookingId,
            inventoryUnitId: unit.id,
            assignedAt: new Date(),
            scannedOutAt: new Date(),
            status: ASSIGNMENT_STATUS.DISPATCHED,
        };

        await db.insert(bookingUnitAssignments).values(newAssignment).execute();

        // 4. Update unit status
        await db.update(inventoryUnits)
            .set({ availabilityStatus: "on_rent", updatedAt: new Date() })
            .where(eq(inventoryUnits.id, unit.id))
            .execute();

        return NextResponse.json({ success: true, assignment: newAssignment });
    } catch (error) {
        console.error("Assignment Error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
