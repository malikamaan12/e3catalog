import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { dispatchRoutes, dispatchStops, bookings, users } from "@/lib/db/schema";
import { requireAdmin } from "@/lib/requireAdmin";
import { USER_ROLES } from "@/lib/constants";
import { clusterBookingsIntoRoutes } from "@/lib/dispatch-clustering";
import { desc, eq, inArray, and } from "drizzle-orm";
import { v4 as uuid } from "uuid";

export async function GET(req: NextRequest) {
    const { error } = await requireAdmin([
        USER_ROLES.ADMIN,
        USER_ROLES.SUPER_ADMIN,
        USER_ROLES.WAREHOUSE_MANAGER,
    ]);
    if (error) return error;

    try {
        const routes = await db.query.dispatchRoutes.findMany({
            with: {
                driver: {
                    columns: { id: true, name: true, email: true }
                },
                stops: {
                    with: {
                        booking: {
                            columns: {
                                id: true,
                                projectName: true,
                                customerName: true,
                                customerPhone: true,
                                status: true,
                            },
                        },
                    },
                    orderBy: (tbl, { asc }) => [asc(tbl.sequenceIndex)],
                },
            },
            orderBy: [desc(dispatchRoutes.scheduledDate)],
            limit: 50,
        });

        return NextResponse.json({ routes });
    } catch (e: any) {
        console.error("GET /api/admin/transport/clusters error:", e);
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    const { user, error } = await requireAdmin([
        USER_ROLES.ADMIN,
        USER_ROLES.SUPER_ADMIN,
        USER_ROLES.WAREHOUSE_MANAGER,
    ]);
    if (error) return error;

    try {
        const body = await req.json().catch(() => ({}));
        const { targetDate, maxStopsPerRoute = 5 } = body;

        const scheduledDate = targetDate ? new Date(targetDate) : new Date();

        // 1. Fetch eligible bookings staged, approved, or booked for delivery
        const candidateBookings = await db.query.bookings.findMany({
            where: inArray(bookings.status, ["approved", "booked", "staged"]),
            with: { product: true },
            limit: 40,
        });

        if (candidateBookings.length === 0) {
            return NextResponse.json({
                success: true,
                message: "No unassigned bookings found awaiting delivery routing.",
                createdRoutes: [],
            });
        }

        // 2. Transform into clustering inputs
        const waypoints = candidateBookings.map(b => ({
            bookingId: b.id,
            bookingNumber: b.id.slice(0, 8),
            projectName: b.projectName || "Event Production",
            venueAddress: b.notes || b.customNotes || "Doha, Qatar",
            contactPerson: b.customerName || undefined,
            contactPhone: b.customerPhone || undefined,
            units: b.units || 1,
            weightKg: 40,
            timeWindowStart: b.startTime || "09:00",
            timeWindowEnd: b.endTime || "13:00",
            stopType: "delivery" as const,
        }));

        // 3. Run algorithmic clustering
        const generatedClusters = clusterBookingsIntoRoutes(waypoints, {
            scheduledDate,
            maxStopsPerRoute: Number(maxStopsPerRoute) || 5,
        });

        const createdRoutes = [];

        // 4. Persist generated routes and stops
        for (const cluster of generatedClusters) {
            const routeId = uuid();
            const clusterNum = `ROUTE-${cluster.zone.substring(0, 3).toUpperCase()}-${Date.now().toString().slice(-4)}-${Math.floor(Math.random() * 90 + 10)}`;

            await db.insert(dispatchRoutes).values({
                id: routeId,
                clusterNumber: clusterNum,
                zone: cluster.zone,
                vehiclePlate: cluster.suggestedVehiclePlate,
                vehicleCapacityKg: cluster.vehicleCapacityKg,
                scheduledDate: cluster.scheduledDate,
                status: "sequenced",
                totalStops: cluster.totalStops,
                totalWeightKg: cluster.totalWeightKg,
                totalVolumeCbm: cluster.totalVolumeCbm,
                notes: `Automated route sequencing for ${cluster.zone}`,
            });

            for (const stop of cluster.stops) {
                await db.insert(dispatchStops).values({
                    id: uuid(),
                    routeId,
                    bookingId: stop.bookingId,
                    sequenceIndex: stop.sequenceIndex,
                    venueAddress: stop.venueAddress,
                    contactPerson: stop.contactPerson || null,
                    contactPhone: stop.contactPhone || null,
                    timeWindowStart: stop.timeWindowStart,
                    timeWindowEnd: stop.timeWindowEnd,
                    stopType: stop.stopType,
                    status: "pending",
                });
            }

            const savedRoute = await db.query.dispatchRoutes.findFirst({
                where: eq(dispatchRoutes.id, routeId),
                with: { stops: true },
            });
            createdRoutes.push(savedRoute);
        }

        return NextResponse.json({
            success: true,
            message: `Successfully clustered ${waypoints.length} bookings into ${createdRoutes.length} multi-stop routes!`,
            createdRoutes,
        });
    } catch (e: any) {
        console.error("POST /api/admin/transport/clusters error:", e);
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
