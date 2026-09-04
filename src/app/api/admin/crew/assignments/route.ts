import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { bookingCrewAssignments, eventCrewRoles, bookings } from "@/lib/db/schema";
import { scheduleCrewShift } from "@/lib/crew-scheduling";
import { desc, eq } from "drizzle-orm";

export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        const bookingId = searchParams.get("bookingId");

        const query = db
            .select({
                id: bookingCrewAssignments.id,
                bookingId: bookingCrewAssignments.bookingId,
                projectName: bookings.projectName,
                crewName: bookingCrewAssignments.crewName,
                roleId: bookingCrewAssignments.roleId,
                roleName: eventCrewRoles.name,
                callTime: bookingCrewAssignments.callTime,
                endTime: bookingCrewAssignments.endTime,
                venueLocation: bookingCrewAssignments.venueLocation,
                status: bookingCrewAssignments.status,
                checkInAt: bookingCrewAssignments.checkInAt,
                checkOutAt: bookingCrewAssignments.checkOutAt,
                standardHours: bookingCrewAssignments.standardHours,
                overtimeHours: bookingCrewAssignments.overtimeHours,
                hourlyRate: bookingCrewAssignments.hourlyRate,
                laborCost: bookingCrewAssignments.laborCost,
                notes: bookingCrewAssignments.notes,
            })
            .from(bookingCrewAssignments)
            .leftJoin(eventCrewRoles, eq(bookingCrewAssignments.roleId, eventCrewRoles.id))
            .leftJoin(bookings, eq(bookingCrewAssignments.bookingId, bookings.id))
            .orderBy(desc(bookingCrewAssignments.callTime));

        const assignments = bookingId 
            ? await query.where(eq(bookingCrewAssignments.bookingId, bookingId))
            : await query.limit(50);

        return NextResponse.json({ assignments });
    } catch (err: any) {
        console.error("Crew assignments GET error:", err);
        return NextResponse.json({ error: err.message || "Failed to load crew assignments" }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const {
            bookingId,
            userId,
            crewName,
            roleId,
            callTime,
            endTime,
            venueLocation,
            notes,
            customHourlyRate,
        } = body;

        if (!bookingId || !crewName || !callTime || !endTime || !venueLocation) {
            return NextResponse.json({ error: "Missing required shift fields" }, { status: 400 });
        }

        const scheduled = await scheduleCrewShift({
            bookingId,
            userId,
            crewName,
            roleId,
            callTime: new Date(callTime),
            endTime: new Date(endTime),
            venueLocation,
            notes,
            customHourlyRate,
        });

        return NextResponse.json({ success: true, assignment: scheduled }, { status: 201 });
    } catch (err: any) {
        console.error("Crew assignments POST error:", err);
        return NextResponse.json({ error: err.message || "Failed to schedule crew shift" }, { status: 400 });
    }
}
