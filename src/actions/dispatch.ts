"use server";

import { db } from "@/lib/db";
import { bookings, bookingDispatchLogs, bookingUnitAssignments, inventoryUnits, products } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { requireAdmin } from "@/lib/requireAdmin";
import { revalidatePath } from "next/cache";

export async function finalizeTransport(
    bookingId: string, 
    driverData: { driverName: string; vehiclePlateNumber: string; transportCompany?: string }
): Promise<{ success: boolean; error?: string }> {
    const authCheck = await requireAdmin();
    if (authCheck.error) return { error: "Unauthorized", success: false };

    try {
        const result = await db.transaction(async (tx) => {
            // Check if booking exists
            const [booking] = await tx.select({ id: bookings.id }).from(bookings).where(eq(bookings.id, bookingId)).limit(1);
            if (!booking) {
                return { error: "Booking not found", success: false };
            }

            // Calculate total gross weight from assigned units payload
            const unitsQuery = await tx
                .select({ weight: products.weight })
                .from(bookingUnitAssignments)
                .innerJoin(inventoryUnits, eq(bookingUnitAssignments.inventoryUnitId, inventoryUnits.id))
                .innerJoin(products, eq(inventoryUnits.productId, products.id))
                .where(eq(bookingUnitAssignments.bookingId, bookingId));

            let totalGrossWeight = 0;
            unitsQuery.forEach((u) => {
                const wStr = u.weight || "0";
                const wNum = parseFloat(wStr.replace(/[^0-9.]/g, ""));
                if (!isNaN(wNum)) totalGrossWeight += wNum;
            });

            // Prevent duplicate manifest insertions
            const [existingLog] = await tx.select({ id: bookingDispatchLogs.id }).from(bookingDispatchLogs).where(eq(bookingDispatchLogs.bookingId, bookingId)).limit(1);

            if (!existingLog) {
                const logId = crypto.randomUUID();
                await tx.insert(bookingDispatchLogs).values({
                    id: logId,
                    bookingId,
                    driverName: driverData.driverName,
                    vehiclePlateNumber: driverData.vehiclePlateNumber,
                    transportCompany: driverData.transportCompany || "E3 Internal Fleet",
                    totalGrossWeight: Math.round(totalGrossWeight),
                });
            } else {
                 await tx.update(bookingDispatchLogs)
                 .set({
                    driverName: driverData.driverName,
                    vehiclePlateNumber: driverData.vehiclePlateNumber,
                    totalGrossWeight: Math.round(totalGrossWeight),
                 })
                 .where(eq(bookingDispatchLogs.id, existingLog.id));
            }

            // Update Core Booking Status
            await tx.update(bookings)
                .set({ 
                    status: "dispatched", 
                    fulfillmentStatus: "out_for_delivery", 
                    updatedAt: new Date() 
                })
                .where(eq(bookings.id, bookingId));

            // Sync physical units to Dispatched state
            await tx.update(bookingUnitAssignments)
                .set({ status: "dispatched" })
                .where(eq(bookingUnitAssignments.bookingId, bookingId));
            
            // Mark underlying units as deployed
            // Fetch all assigned units for this booking to update underlying core inventory Units
            const assignmentRows = await tx.select({ inventoryUnitId: bookingUnitAssignments.inventoryUnitId })
                .from(bookingUnitAssignments)
                .where(eq(bookingUnitAssignments.bookingId, bookingId));
                
            for (const row of assignmentRows) {
                await tx.update(inventoryUnits)
                    .set({ availabilityStatus: 'deployed', updatedAt: new Date() })
                    .where(eq(inventoryUnits.id, row.inventoryUnitId));
            }
            
            return { success: true };
        });

        revalidatePath("/dashboard/warehouse/dispatch");
        revalidatePath("/dashboard/warehouse/fulfillment");
        revalidatePath("/dashboard/warehouse/overview");
        
        return result;
    } catch (err: any) {
        console.error("Failed to finalize transport:", err);
        return { error: err.message || "Failed to finalize transport setup.", success: false };
    }
}
