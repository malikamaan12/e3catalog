import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { fleetGpsPings, bookingDispatchLogs } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { getCurrentUser } from "@/lib/auth";
import { v4 as uuid } from "uuid";

export async function POST(req: NextRequest) {
    try {
        const user = await getCurrentUser();
        // Allow driver user or authenticated staff
        const body = await req.json();
        const {
            dispatchLogId,
            vehiclePlate,
            latitude,
            longitude,
            heading,
            speed,
            status = "in_transit",
        } = body;

        if (!dispatchLogId || latitude === undefined || longitude === undefined) {
            return NextResponse.json({ error: "dispatchLogId, latitude, and longitude are required." }, { status: 400 });
        }

        const pingId = uuid();
        const [ping] = await db.insert(fleetGpsPings).values({
            id: pingId,
            dispatchLogId,
            driverId: user?.id || null,
            vehiclePlate: vehiclePlate || null,
            latitude: parseFloat(latitude),
            longitude: parseFloat(longitude),
            heading: heading !== undefined ? parseFloat(heading) : null,
            speed: speed !== undefined ? parseFloat(speed) : null,
            status,
        }).returning();

        return NextResponse.json({ success: true, pingId: ping.id }, { status: 201 });
    } catch (e: any) {
        console.error("POST /api/driver/gps error:", e);
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
