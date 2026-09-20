import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { bookings, bookingDispatchLogs, bookingUnitAssignments, inventoryUnits, proofOfDeliveries, products } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";

export async function POST(req: NextRequest) {
    const session = await getSession();
    if (!session || !["admin", "super_admin", "vendor", "warehouse_manager"].includes(session.role)) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const body = await req.json();
        const {
            bookingId,
            driverName,
            vehiclePlateNumber,
            transportCompany = "E3 Logistics",
            recipientName,
            recipientPhone,
            recipientNationalId,
            signatureData,
            notes,
        } = body;

        if (!bookingId || !driverName?.trim() || !vehiclePlateNumber?.trim() || !signatureData) {
            return NextResponse.json({
                error: "Booking ID, Driver Name, Vehicle Plate Number, and Digital Signature are required."
            }, { status: 400 });
        }

        const result = await db.transaction(async (tx) => {
            const [booking] = await tx.select().from(bookings).where(eq(bookings.id, bookingId)).limit(1);
            if (!booking) {
                throw new Error("Target booking not found");
            }

            // Calculate total weight
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

            // 1. Create or update bookingDispatchLogs
            const [existingLog] = await tx
                .select({ id: bookingDispatchLogs.id })
                .from(bookingDispatchLogs)
                .where(eq(bookingDispatchLogs.bookingId, bookingId))
                .limit(1);

            let dispatchLogId = existingLog?.id;
            if (!dispatchLogId) {
                dispatchLogId = crypto.randomUUID();
                await tx.insert(bookingDispatchLogs).values({
                    id: dispatchLogId,
                    bookingId,
                    driverName: driverName.trim(),
                    vehiclePlateNumber: vehiclePlateNumber.trim().toUpperCase(),
                    transportCompany: transportCompany.trim(),
                    totalGrossWeight: Math.round(totalGrossWeight),
                    dispatchedAt: new Date(),
                });
            } else {
                await tx.update(bookingDispatchLogs)
                    .set({
                        driverName: driverName.trim(),
                        vehiclePlateNumber: vehiclePlateNumber.trim().toUpperCase(),
                        transportCompany: transportCompany.trim(),
                        totalGrossWeight: Math.round(totalGrossWeight),
                    })
                    .where(eq(bookingDispatchLogs.id, dispatchLogId));
            }

            // 2. Insert into proofOfDeliveries with electronic signature
            const podId = crypto.randomUUID();
            const [pod] = await tx.insert(proofOfDeliveries).values({
                id: podId,
                bookingId,
                dispatchLogId,
                driverId: session.id || null,
                driverName: driverName.trim(),
                recipientName: (recipientName || driverName).trim(),
                recipientPhone: recipientPhone?.trim() || null,
                recipientNationalId: recipientNationalId?.trim() || null,
                signatureData, // Vectorized Base64 PNG
                deliveryStatus: "delivered",
                notes: notes?.trim() || `Handover completed at warehouse dock. Driver: ${driverName.trim()} (${vehiclePlateNumber.trim()}).`,
                deliveredAt: new Date(),
            }).returning();

            // 3. Update Booking Status
            await tx.update(bookings)
                .set({
                    status: "dispatched",
                    fulfillmentStatus: "out_for_delivery",
                    updatedAt: new Date(),
                })
                .where(eq(bookings.id, bookingId));

            // 4. Update assigned units to dispatched
            await tx.update(bookingUnitAssignments)
                .set({ status: "dispatched" })
                .where(eq(bookingUnitAssignments.bookingId, bookingId));

            // 5. Update physical units to on_rent
            const assignments = await tx
                .select({ inventoryUnitId: bookingUnitAssignments.inventoryUnitId })
                .from(bookingUnitAssignments)
                .where(eq(bookingUnitAssignments.bookingId, bookingId));

            for (const a of assignments) {
                if (a.inventoryUnitId) {
                    await tx.update(inventoryUnits)
                        .set({ availabilityStatus: "on_rent", updatedAt: new Date() })
                        .where(eq(inventoryUnits.id, a.inventoryUnitId));
                }
            }

            return {
                success: true,
                podId: pod.id,
                manifestUrl: `/api/pdf/manifest/${bookingId}`,
                message: `Successfully executed handover & signed manifest for ${booking.projectName || booking.customerName}.`,
            };
        });

        revalidatePath("/dashboard/warehouse/dispatch");
        revalidatePath("/dashboard/warehouse/fulfillment");
        revalidatePath("/dashboard/warehouse/overview");
        revalidatePath("/dashboard/warehouse/transport");

        return NextResponse.json(result);
    } catch (err: any) {
        console.error("Handover Signature Error:", err);
        return NextResponse.json({ error: err.message || "Failed to process electronic handover" }, { status: 500 });
    }
}
