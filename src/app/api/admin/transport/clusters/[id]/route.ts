import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { dispatchRoutes, dispatchStops } from "@/lib/db/schema";
import { requireAdmin } from "@/lib/requireAdmin";
import { USER_ROLES } from "@/lib/constants";
import { eq } from "drizzle-orm";

export async function GET(
    req: NextRequest,
    context: { params: Promise<{ id: string }> }
) {
    const { id: routeId } = await context.params;
    const { error } = await requireAdmin([
        USER_ROLES.ADMIN,
        USER_ROLES.SUPER_ADMIN,
        USER_ROLES.WAREHOUSE_MANAGER,
    ]);
    if (error) return error;

    try {
        const route = await db.query.dispatchRoutes.findFirst({
            where: eq(dispatchRoutes.id, routeId),
            with: {
                driver: true,
                stops: {
                    with: { booking: true },
                    orderBy: (tbl, { asc }) => [asc(tbl.sequenceIndex)],
                },
            },
        });

        if (!route) {
            return NextResponse.json({ error: "Route not found" }, { status: 404 });
        }

        return NextResponse.json({ route });
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}

export async function PATCH(
    req: NextRequest,
    context: { params: Promise<{ id: string }> }
) {
    const { id: routeId } = await context.params;
    const { error } = await requireAdmin([
        USER_ROLES.ADMIN,
        USER_ROLES.SUPER_ADMIN,
        USER_ROLES.WAREHOUSE_MANAGER,
    ]);
    if (error) return error;

    try {
        const body = await req.json();
        const {
            status,
            driverId,
            driverName,
            vehiclePlate,
            notes,
            stopId,
            stopStatus,
        } = body;

        // If updating a specific stop
        if (stopId && stopStatus) {
            await db.update(dispatchStops)
                .set({
                    status: stopStatus,
                    completedAt: stopStatus === "completed" ? new Date() : null,
                    updatedAt: new Date(),
                })
                .where(eq(dispatchStops.id, stopId));

            return NextResponse.json({ success: true, message: `Stop updated to ${stopStatus}` });
        }

        // Updating the route
        await db.update(dispatchRoutes)
            .set({
                ...(status ? { status } : {}),
                ...(driverId !== undefined ? { driverId } : {}),
                ...(driverName !== undefined ? { driverName } : {}),
                ...(vehiclePlate !== undefined ? { vehiclePlate } : {}),
                ...(notes !== undefined ? { notes } : {}),
                updatedAt: new Date(),
            })
            .where(eq(dispatchRoutes.id, routeId));

        const updated = await db.query.dispatchRoutes.findFirst({
            where: eq(dispatchRoutes.id, routeId),
            with: { driver: true, stops: true },
        });

        return NextResponse.json({ success: true, route: updated });
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
