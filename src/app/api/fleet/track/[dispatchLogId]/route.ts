import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { fleetGpsPings, bookingDispatchLogs } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ dispatchLogId: string }> }
) {
    const { dispatchLogId } = await params;

    try {
        const dispatchLog = await db.query.bookingDispatchLogs.findFirst({
            where: eq(bookingDispatchLogs.id, dispatchLogId),
            with: {
                booking: {
                    with: { product: true, user: true }
                }
            }
        });

        if (!dispatchLog) {
            return NextResponse.json({ error: "Dispatch log not found" }, { status: 404 });
        }

        // Fetch recent GPS pings
        const pings = await db.query.fleetGpsPings.findMany({
            where: eq(fleetGpsPings.dispatchLogId, dispatchLogId),
            orderBy: [desc(fleetGpsPings.createdAt)],
            limit: 25,
        });

        const latestPing = pings[0] || {
            latitude: 25.2867, // Default Doha center
            longitude: 51.5333,
            speed: 45,
            heading: 120,
            status: "in_transit",
            createdAt: new Date().toISOString(),
        };

        // Destination default: Doha West Bay / Venue notes
        const destination = {
            name: dispatchLog.booking?.projectName || "Event Production Venue",
            address: dispatchLog.booking?.notes || dispatchLog.booking?.customNotes || "Doha, State of Qatar",
            latitude: 25.3215, // Lusail / West Bay default venue coordinates
            longitude: 51.5284,
        };

        // Calculate rough ETA in minutes (e.g. 15-25 min)
        const etaMinutes = latestPing.status === "arrived" ? 0 : 18;

        return NextResponse.json({
            dispatchLog: {
                id: dispatchLog.id,
                driverName: dispatchLog.driverName,
                vehiclePlateNumber: dispatchLog.vehiclePlateNumber,
                transportCompany: dispatchLog.transportCompany,
                dispatchedAt: dispatchLog.dispatchedAt,
                booking: dispatchLog.booking,
            },
            latestPing,
            recentPings: pings,
            destination,
            etaMinutes,
        });

    } catch (e: any) {
        console.error("GET /api/fleet/track/[dispatchLogId] error:", e);
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
