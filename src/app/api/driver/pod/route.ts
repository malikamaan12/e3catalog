import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { proofOfDeliveries, bookings, bookingDispatchLogs } from "@/lib/db/schema";
import { eq, desc, and } from "drizzle-orm";
import { getCurrentUser } from "@/lib/auth";
import { BOOKING_STATUS } from "@/lib/constants";
import { v4 as uuid } from "uuid";
import { logStatusTransition } from "@/lib/state-machine";

export async function POST(req: NextRequest) {
    try {
        const user = await getCurrentUser();
        const body = await req.json();

        const {
            bookingId,
            dispatchLogId,
            recipientName,
            recipientPhone,
            recipientNationalId,
            signatureData,
            photoUrls = [],
            deliveryStatus = "delivered",
            notes,
            latitude,
            longitude,
        } = body;

        if (!bookingId || !recipientName || !signatureData) {
            return NextResponse.json({
                error: "bookingId, recipientName, and signatureData are required."
            }, { status: 400 });
        }

        const booking = await db.query.bookings.findFirst({
            where: eq(bookings.id, bookingId),
        });

        if (!booking) {
            return NextResponse.json({ error: "Booking not found." }, { status: 404 });
        }

        const podId = uuid();

        // 1. Insert POD Record
        const [newPod] = await db.insert(proofOfDeliveries).values({
            id: podId,
            bookingId,
            dispatchLogId: dispatchLogId || null,
            driverId: user?.id || null,
            driverName: user?.name || "Driver",
            recipientName,
            recipientPhone: recipientPhone || null,
            recipientNationalId: recipientNationalId || null,
            signatureData,
            photoUrls: photoUrls || [],
            deliveryStatus,
            notes: notes || null,
            latitude: latitude ? parseFloat(latitude) : null,
            longitude: longitude ? parseFloat(longitude) : null,
        }).returning();

        // 2. Transition booking status to 'on_rent' or 'delivered' if full delivery
        if (deliveryStatus === "delivered") {
            const nextStatus = "on_rent";
            await db.update(bookings)
                .set({
                    status: nextStatus,
                    updatedAt: new Date(),
                })
                .where(eq(bookings.id, bookingId));

            await logStatusTransition({
                actorId: user?.id || "driver",
                targetId: bookingId,
                fromStatus: booking.status,
                toStatus: nextStatus,
                role: "driver",
                details: `Equipment handed over on-site to ${recipientName} (QID: ${recipientNationalId || 'N/A'}). POD #${podId.slice(0, 8)} signed.`,
            });
        }

        return NextResponse.json({
            success: true,
            pod: newPod,
            message: "Proof of Delivery successfully submitted and signed."
        }, { status: 201 });

    } catch (e: any) {
        console.error("POST /api/driver/pod error:", e);
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}

export async function GET(req: NextRequest) {
    try {
        const url = new URL(req.url);
        const bookingId = url.searchParams.get("bookingId");

        if (!bookingId) {
            return NextResponse.json({ error: "bookingId query param required" }, { status: 400 });
        }

        const pod = await db.query.proofOfDeliveries.findFirst({
            where: eq(proofOfDeliveries.bookingId, bookingId),
            with: {
                booking: {
                    with: { product: true }
                },
                driver: {
                    columns: { id: true, name: true, email: true }
                }
            }
        });

        if (!pod) {
            return NextResponse.json({ error: "Proof of Delivery not found" }, { status: 404 });
        }

        return NextResponse.json({ pod });
    } catch (e: any) {
        console.error("GET /api/driver/pod error:", e);
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
