import { db } from "@/lib/db";
import { bookings, inventoryUnits, bookingUnitAssignments, products, inspectionLogs } from "@/lib/db/schema";
import { eq, and, sql } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { v4 as uuid } from "uuid";
import { requireAdmin } from "@/lib/requireAdmin";

/**
 * GET /api/admin/fulfillment?bookingId=...
 * Returns booking details + assigned units for the warehouse view.
 */
export async function GET(req: NextRequest) {
    const { user, error } = await requireAdmin(["admin", "super_admin", "warehouse_manager", "vendor"]);
    if (error) return error;

    const { searchParams } = new URL(req.url);
    const bookingId = searchParams.get("bookingId");

    if (!bookingId) {
        return NextResponse.json({ error: "Booking ID required" }, { status: 400 });
    }

    const bookingRes = await db.query.bookings.findFirst({
        where: eq(bookings.id, bookingId),
        with: {
            product: true,
            unitAssignments: {
                with: {
                    inventoryUnit: true
                }
            }
        }
    });

    if (!bookingRes) {
        return NextResponse.json({ error: "Booking not found" }, { status: 404 });
    }

    // Security: Only allow vendor to see their own bookings
    if (user.role === 'vendor' && bookingRes.vendorId !== (user as any).vendorId) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Redact for Warehouse Manager (Financial Blindness)
    if (user.role === 'warehouse_manager') {
        const sanitized = { ...bookingRes };
        delete (sanitized as any).totalPrice;
        delete (sanitized as any).discount;
        delete (sanitized as any).logisticsCost;
        delete (sanitized as any).laborCost;
        delete (sanitized as any).additionalChargeAmount;
        // Keep customerName and customerPhone for logistics
        delete (sanitized as any).customerEmail;
        
        // Product pricing redaction
        if (sanitized.product) {
            const sanitizedProd = { ...sanitized.product };
            delete (sanitizedProd as any).pricePerDay;
            delete (sanitizedProd as any).pricePerHour;
            sanitized.product = sanitizedProd as any;
        }

        return NextResponse.json(sanitized);
    }

    return NextResponse.json(bookingRes);
}

/**
 * POST /api/admin/fulfillment
 * Action: Scan a QR code to fulfill or return.
 * Body: { bookingId: string, assetTag: string, action: 'dispatch' | 'return', condition?: string, notes?: string }
 */
export async function POST(req: NextRequest) {
    const { user, error } = await requireAdmin(["admin", "super_admin", "warehouse_manager", "vendor"]);
    if (error) return error;

    const body = await req.json();
    const { bookingId, assetTag, action, condition, notes } = body;

    if (!bookingId || !assetTag || !action) {
        return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // 1. Find the unit by tag
    const unit = await db.query.inventoryUnits.findFirst({
        where: eq(inventoryUnits.assetTagCode, assetTag),
        with: { product: true }
    });

    if (!unit) {
        return NextResponse.json({ error: `Asset tag ${assetTag} not found.` }, { status: 404 });
    }

    // 2. Find the booking
    const booking = await db.query.bookings.findFirst({
        where: eq(bookings.id, bookingId),
    });

    if (!booking) {
        return NextResponse.json({ error: "Booking not found" }, { status: 404 });
    }

    // Security: Vendor check
    if (user.role === 'vendor' && unit.vendorId !== (user as any).vendorId) {
        return NextResponse.json({ error: "Resource does not belong to your vendor account." }, { status: 403 });
    }

    const now = new Date();

    if (action === "dispatch") {
        // --- PRE-RENTAL DISPATCH LOGIC ---
        
        // Check if product matches
        if (unit.productId !== booking.productId) {
            return NextResponse.json({ error: `Incorrect Product. Asset ${assetTag} is a ${unit.product.name}.` }, { status: 400 });
        }

        // Check if unit is available
        if (unit.availabilityStatus !== "in_warehouse") {
            return NextResponse.json({ error: `Asset is currently marked as ${unit.availabilityStatus}.` }, { status: 400 });
        }

        // Check if booking already completely fulfilled
        const currentAssignments = await db.query.bookingUnitAssignments.findMany({
            where: and(
                eq(bookingUnitAssignments.bookingId, bookingId),
                sql`${bookingUnitAssignments.status} != 'returned'`
            )
        });

        if (currentAssignments.length >= booking.units) {
            return NextResponse.json({ error: "Booking already fully fulfilled." }, { status: 400 });
        }

        // Perform Assignment
        await db.insert(bookingUnitAssignments).values({
            id: uuid(),
            bookingId,
            inventoryUnitId: unit.id,
            scannedOutAt: now,
            status: "dispatched"
        });

        // Update Unit Status
        await db.update(inventoryUnits)
            .set({ availabilityStatus: "on_rent", updatedAt: now })
            .where(eq(inventoryUnits.id, unit.id));

        return NextResponse.json({ success: true, message: `Asset ${assetTag} dispatched.` });

    } else if (action === "return") {
        // --- POST-RENTAL RETURN LOGIC ---
        
        // Find the active assignment
        const assignment = await db.query.bookingUnitAssignments.findFirst({
            where: and(
                eq(bookingUnitAssignments.bookingId, bookingId),
                eq(bookingUnitAssignments.inventoryUnitId, unit.id),
                eq(bookingUnitAssignments.status, "dispatched")
            )
        });

        if (!assignment) {
            return NextResponse.json({ error: "This asset was not assigned to this booking." }, { status: 400 });
        }

        // Update Assignment
        await db.update(bookingUnitAssignments)
            .set({ scannedInAt: now, status: "returned" })
            .where(eq(bookingUnitAssignments.id, assignment.id));

        // Update Unit Status & Condition
        const newCondition = condition || unit.conditionStatus;
        await db.update(inventoryUnits)
            .set({ 
                availabilityStatus: "in_warehouse", 
                conditionStatus: newCondition,
                lastInspectionDate: now,
                updatedAt: now 
            })
            .where(eq(inventoryUnits.id, unit.id));

        // Create Inspection Log
        await db.insert(inspectionLogs).values({
            id: uuid(),
            unitId: unit.id,
            inspectorId: user.id,
            inspectionType: "return",
            conditionBefore: unit.conditionStatus,
            conditionAfter: newCondition,
            notes: notes || "Returned from booking " + bookingId,
            createdAt: now
        });

        return NextResponse.json({ success: true, message: `Asset ${assetTag} returned. Status: ${newCondition}` });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
}
