import { db } from "@/lib/db";
import { bookings, bookingUnitAssignments, inventoryUnits } from "@/lib/db/schema";
import { eq, and, or, inArray, gte, lte, asc } from "drizzle-orm";

export interface CrossDockRecommendation {
    unitId: string;
    assetTagCode: string;
    productId: string;
    productName: string;
    isCrossDock: boolean;
    targetBooking?: {
        id: string;
        projectName: string | null;
        customerName: string;
        startDate: Date;
        hoursUntilDeparture: number;
        stagingBay: string;
    };
}

/**
 * Checks if a returned unit can be cross-docked directly into an upcoming booking
 * departing within the specified lookahead window (default 48 hours).
 */
export async function checkCrossDockOpportunity(
    unitIdentifier: string, // Asset Tag or Unit ID or RFID EPC
    lookaheadHours = 48
): Promise<CrossDockRecommendation> {
    const cleanId = unitIdentifier.trim().toUpperCase();

    // 1. Resolve unit & product
    const unit = await db.query.inventoryUnits.findFirst({
        where: or(
            eq(inventoryUnits.assetTagCode, cleanId),
            eq(inventoryUnits.id, unitIdentifier),
            eq(inventoryUnits.rfidTag, cleanId),
            eq(inventoryUnits.serialNumber, cleanId)
        ),
        with: { product: true }
    });

    if (!unit) {
        return {
            unitId: "",
            assetTagCode: cleanId,
            productId: "",
            productName: "Unknown Item",
            isCrossDock: false,
        };
    }

    const now = new Date();
    const windowEnd = new Date(now.getTime() + lookaheadHours * 60 * 60 * 1000);

    // 2. Find eligible upcoming bookings requiring this product
    // Either the unit is already assigned to this booking in 'reserved' state,
    // or the booking has an unfulfilled requirement for this product.
    const eligibleBookings = await db.query.bookings.findMany({
        where: and(
            inArray(bookings.status, ["approved", "booked", "quote_accepted"]),
            gte(bookings.startDate, now),
            lte(bookings.startDate, windowEnd)
        ),
        orderBy: [asc(bookings.startDate)],
        with: {
            unitAssignments: {
                where: eq(bookingUnitAssignments.inventoryUnitId, unit.id)
            }
        }
    });

    // Check if unit is explicitly reserved for any of these bookings
    const reservedBooking = eligibleBookings.find(b => b.unitAssignments && b.unitAssignments.length > 0);
    const target = reservedBooking || eligibleBookings.find(b => b.productId === unit.productId);

    if (target) {
        const hoursUntil = Math.max(0, Math.round((new Date(target.startDate).getTime() - now.getTime()) / (1000 * 60 * 60)));
        return {
            unitId: unit.id,
            assetTagCode: unit.assetTagCode,
            productId: unit.productId,
            productName: unit.product?.name || "Equipment",
            isCrossDock: true,
            targetBooking: {
                id: target.id,
                projectName: target.projectName,
                customerName: target.customerName,
                startDate: target.startDate,
                hoursUntilDeparture: hoursUntil,
                stagingBay: "Bay 02 - Outbound Fast Track",
            }
        };
    }

    return {
        unitId: unit.id,
        assetTagCode: unit.assetTagCode,
        productId: unit.productId,
        productName: unit.product?.name || "Equipment",
        isCrossDock: false,
    };
}

/**
 * Automatically allocates and stages a cross-docked unit to an outbound booking.
 */
export async function fastTrackCrossDock(
    unitId: string,
    bookingId: string,
    stagingBay = "Bay 02 - Outbound Fast Track"
): Promise<{ success: boolean; message: string }> {
    try {
        const [unit] = await db.select().from(inventoryUnits).where(eq(inventoryUnits.id, unitId)).limit(1);
        const [booking] = await db.select().from(bookings).where(eq(bookings.id, bookingId)).limit(1);

        if (!unit || !booking) {
            return { success: false, message: "Unit or Booking not found." };
        }

        // Check if already assigned
        const existing = await db.query.bookingUnitAssignments.findFirst({
            where: and(
                eq(bookingUnitAssignments.bookingId, bookingId),
                eq(bookingUnitAssignments.inventoryUnitId, unitId)
            )
        });

        if (!existing) {
            await db.insert(bookingUnitAssignments).values({
                id: crypto.randomUUID(),
                bookingId,
                inventoryUnitId: unitId,
                status: "staged",
                assignedAt: new Date(),
            });
        } else {
            await db.update(bookingUnitAssignments)
                .set({ status: "staged" })
                .where(eq(bookingUnitAssignments.id, existing.id));
        }

        // Mark unit as staged in the outbound staging bay
        await db.update(inventoryUnits)
            .set({
                availabilityStatus: "in_warehouse",
                shelfLocation: stagingBay,
                updatedAt: new Date()
            })
            .where(eq(inventoryUnits.id, unitId));

        return {
            success: true,
            message: `Successfully cross-docked ${unit.assetTagCode} directly to ${booking.projectName || booking.customerName} (${stagingBay}).`
        };
    } catch (err: any) {
        console.error("Fast Track Cross-Dock Error:", err);
        return { success: false, message: err.message || "Failed to cross-dock unit" };
    }
}
