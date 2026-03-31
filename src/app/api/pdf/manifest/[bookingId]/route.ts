import { NextRequest, NextResponse } from "next/server";
import { renderToStream } from "@react-pdf/renderer";
import TransportManifestPDF from "@/components/warehouse/TransportManifestPDF";
import { db } from "@/lib/db";
import { bookings, bookingDispatchLogs, bookingUnitAssignments, inventoryUnits, products } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { format } from "date-fns";

export async function GET(req: NextRequest, { params }: { params: { bookingId: string } }) {
    const bookingId = params.bookingId;

    try {
        // Fetch Booking
        const [booking] = await db.select().from(bookings).where(eq(bookings.id, bookingId));
        if (!booking) {
            return NextResponse.json({ error: "Booking not found" }, { status: 404 });
        }

        // Fetch Dispatch Log
        const [dispatchLog] = await db.select().from(bookingDispatchLogs).where(eq(bookingDispatchLogs.bookingId, bookingId));

        // Fetch payload (items)
        const items = await db
            .select({
                productName: products.name,
                assetTagCode: inventoryUnits.assetTagCode,
                serialNumber: inventoryUnits.serialNumber,
                conditionOut: inventoryUnits.conditionStatus,
            })
            .from(bookingUnitAssignments)
            .innerJoin(inventoryUnits, eq(bookingUnitAssignments.inventoryUnitId, inventoryUnits.id))
            .innerJoin(products, eq(inventoryUnits.productId, products.id))
            .where(eq(bookingUnitAssignments.bookingId, bookingId));

        const data = {
            bookingId: booking.id,
            clientName: booking.customerName || "Walk-in Client",
            venue: booking.notes || "Not Specified",
            deliveryDate: format(new Date(booking.startDate), "MMMM do, yyyy"),
            timeWindow: booking.startTime ? `${booking.startTime} - ${booking.endTime || 'End of Day'}` : "Anytime",
            dispatchLog: dispatchLog ? {
                driverName: dispatchLog.driverName,
                vehiclePlate: dispatchLog.vehiclePlateNumber,
                company: dispatchLog.transportCompany,
                dispatchTime: format(new Date(dispatchLog.dispatchedAt), "MMM do, yyyy HH:mm"),
                grossWeight: `${dispatchLog.totalGrossWeight || 0} KG`
            } : null,
            items: items.map(i => ({
                name: i.productName,
                tag: i.assetTagCode,
                serial: i.serialNumber || 'N/A',
                condition: i.conditionOut.toUpperCase()
            }))
        };

        const stream = await renderToStream(TransportManifestPDF({ data }));

        return new Response(stream as any, {
            headers: {
                "Content-Type": "application/pdf",
                "Content-Disposition": `inline; filename="E3-Delivery-Manifest-${booking.id.slice(0,8)}.pdf"`,
            }
        });
    } catch (err: any) {
        console.error("[PDF generation failed]:", err);
        return NextResponse.json({ error: "Failed to generate PDF manifest" }, { status: 500 });
    }
}
