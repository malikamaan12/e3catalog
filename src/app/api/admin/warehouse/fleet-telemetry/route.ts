import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { bookingDispatchLogs, bookings, fleetGpsPings } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";
import { requireAdmin } from "@/lib/requireAdmin";
import { USER_ROLES } from "@/lib/constants";
import { detectQatarZone } from "@/lib/telemetry-gps";

export async function GET(req: NextRequest) {
    const { user, error } = await requireAdmin([
        USER_ROLES.ADMIN,
        USER_ROLES.SUPER_ADMIN,
        USER_ROLES.WAREHOUSE_MANAGER,
        USER_ROLES.VENDOR,
    ]);
    if (error) return error;

    try {
        // 1. Fetch recent delivery dispatch logs
        const activeDispatches = await db
            .select({
                id: bookingDispatchLogs.id,
                bookingId: bookingDispatchLogs.bookingId,
                driverName: bookingDispatchLogs.driverName,
                vehiclePlateNumber: bookingDispatchLogs.vehiclePlateNumber,
                transportCompany: bookingDispatchLogs.transportCompany,
                dispatchedAt: bookingDispatchLogs.dispatchedAt,
                projectName: bookings.projectName,
                customerName: bookings.customerName,
                customerPhone: bookings.customerPhone,
                fulfillmentStatus: bookings.fulfillmentStatus,
            })
            .from(bookingDispatchLogs)
            .leftJoin(bookings, eq(bookingDispatchLogs.bookingId, bookings.id))
            .orderBy(desc(bookingDispatchLogs.dispatchedAt))
            .limit(20);

        // 2. For each dispatch, retrieve the latest telemetry GPS ping
        const fleetList = await Promise.all(
            activeDispatches.map(async (dispatch) => {
                const [latestPing] = await db
                    .select()
                    .from(fleetGpsPings)
                    .where(eq(fleetGpsPings.dispatchLogId, dispatch.id))
                    .orderBy(desc(fleetGpsPings.createdAt))
                    .limit(1);

                let zone = "Warehouse Base Depot";
                let telemetry = null;

                if (latestPing) {
                    zone = detectQatarZone(latestPing.latitude, latestPing.longitude);
                    telemetry = {
                        latitude: latestPing.latitude,
                        longitude: latestPing.longitude,
                        speedKmh: latestPing.speed ? Math.round(latestPing.speed * 3.6) : 0,
                        heading: latestPing.heading || 0,
                        batteryPct: latestPing.batteryPct || 100,
                        lastPingTime: latestPing.createdAt,
                    };
                }

                return {
                    dispatchId: dispatch.id,
                    bookingId: dispatch.bookingId,
                    driverName: dispatch.driverName || "Fleet Driver",
                    vehiclePlate: dispatch.vehiclePlateNumber || "QA-FLEET",
                    driverPhone: dispatch.customerPhone,
                    status: dispatch.fulfillmentStatus || "out_for_delivery",
                    projectName: dispatch.projectName || dispatch.customerName || "Private Production",
                    customerName: dispatch.customerName,
                    destination: dispatch.projectName || "Doha Metro Area",
                    dispatchedAt: dispatch.dispatchedAt,
                    currentZone: zone,
                    telemetry,
                };
            })
        );

        return NextResponse.json({
            success: true,
            activeCount: fleetList.length,
            fleet: fleetList,
        });
    } catch (err: any) {
        console.error("GET /api/admin/warehouse/fleet-telemetry error:", err);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
