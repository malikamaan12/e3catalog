import { db } from "./db";
import { eventCrewRoles, bookingCrewAssignments, bookings, users } from "./db/schema";
import { eq, and, or, sql, desc } from "drizzle-orm";
import { v4 as uuidv4 } from "uuid";

// Default Production Crew Roles for Qatar Mega-Events
export const DEFAULT_CREW_ROLES = [
    { code: "FOH_AUDIO", name: "Senior FOH Sound Engineer", defaultHourlyRate: 180, overtimeMultiplier: 1.5, description: "Lead audio engineer for line arrays, digital consoles, and RF tuning." },
    { code: "LIGHT_PROG", name: "GrandMA Lighting Programmer", defaultHourlyRate: 200, overtimeMultiplier: 1.5, description: "Lighting console programmer and moving-head fixture director." },
    { code: "LED_TECH", name: "LED Wall & Video Processor Tech", defaultHourlyRate: 175, overtimeMultiplier: 1.5, description: "Novastar/Brompton processor tuning and video wall rigging." },
    { code: "RIGGER", name: "Certified Arena Rigger", defaultHourlyRate: 220, overtimeMultiplier: 1.5, description: "Truss load calculations, motor hoists, and overhead safety sign-off." },
    { code: "STAGE_HAND", name: "Senior Stage Hand & Bump-In Lead", defaultHourlyRate: 95, overtimeMultiplier: 1.5, description: "Physical deployment, cable loom routing, and case distribution." },
    { code: "PROD_MGR", name: "Technical Production Manager", defaultHourlyRate: 250, overtimeMultiplier: 1.5, description: "On-site master timeline, client liaison, and crew coordination." },
];

/**
 * Ensures default technical crew roles are seeded in the database
 */
export async function ensureDefaultCrewRoles() {
    for (const role of DEFAULT_CREW_ROLES) {
        const [existing] = await db.select().from(eventCrewRoles).where(eq(eventCrewRoles.code, role.code));
        if (!existing) {
            await db.insert(eventCrewRoles).values({
                id: uuidv4(),
                code: role.code,
                name: role.name,
                defaultHourlyRate: role.defaultHourlyRate,
                overtimeMultiplier: role.overtimeMultiplier,
                description: role.description,
                isActive: true,
                createdAt: new Date(),
            });
        }
    }
}

/**
 * Checks for crew shift conflicts across Qatar venues
 */
export async function detectCrewConflicts(
    crewName: string,
    callTime: Date,
    endTime: Date,
    excludeAssignmentId?: string
) {
    const overlapping = await db
        .select({
            id: bookingCrewAssignments.id,
            bookingId: bookingCrewAssignments.bookingId,
            crewName: bookingCrewAssignments.crewName,
            callTime: bookingCrewAssignments.callTime,
            endTime: bookingCrewAssignments.endTime,
            venueLocation: bookingCrewAssignments.venueLocation,
            status: bookingCrewAssignments.status,
            projectName: bookings.projectName,
        })
        .from(bookingCrewAssignments)
        .leftJoin(bookings, eq(bookingCrewAssignments.bookingId, bookings.id))
        .where(
            and(
                eq(bookingCrewAssignments.crewName, crewName),
                sql`${bookingCrewAssignments.status} != 'cancelled'`,
                sql`${bookingCrewAssignments.callTime} < ${endTime}`,
                sql`${bookingCrewAssignments.endTime} > ${callTime}`,
                excludeAssignmentId ? sql`${bookingCrewAssignments.id} != ${excludeAssignmentId}` : sql`1=1`
            )
        );

    return {
        hasConflict: overlapping.length > 0,
        conflictDetails: overlapping,
    };
}

export interface ScheduleCrewShiftInput {
    bookingId: string;
    userId?: string;
    crewName: string;
    roleId?: string;
    callTime: Date;
    endTime: Date;
    venueLocation: string;
    notes?: string;
    customHourlyRate?: number;
}

/**
 * Schedules a technician shift with conflict validation and wage configuration
 */
export async function scheduleCrewShift(input: ScheduleCrewShiftInput) {
    // 1. Conflict detection
    const conflict = await detectCrewConflicts(input.crewName, input.callTime, input.endTime);
    if (conflict.hasConflict) {
        const conf = conflict.conflictDetails[0];
        throw new Error(`Schedule conflict: ${input.crewName} is already booked on "${conf.projectName || 'Another Event'}" at ${conf.venueLocation}`);
    }

    // 2. Resolve hourly rate
    let hourlyRate = input.customHourlyRate ?? 150;
    let clientBillableRate = hourlyRate * 1.35; // default 35% margin
    if (input.roleId) {
        const [role] = await db.select().from(eventCrewRoles).where(eq(eventCrewRoles.id, input.roleId));
        if (role) {
            hourlyRate = input.customHourlyRate ?? role.defaultHourlyRate;
            clientBillableRate = hourlyRate * 1.35;
        }
    }

    // Calculate scheduled hours
    const durationMs = input.endTime.getTime() - input.callTime.getTime();
    const plannedHours = Math.max(0, durationMs / (1000 * 60 * 60));
    const standardHours = Math.min(plannedHours, 8.0);
    const overtimeHours = Math.max(0, plannedHours - 8.0);
    const laborCost = (standardHours * hourlyRate) + (overtimeHours * hourlyRate * 1.5);

    const assignmentId = uuidv4();
    await db.insert(bookingCrewAssignments).values({
        id: assignmentId,
        bookingId: input.bookingId,
        userId: input.userId || null,
        crewName: input.crewName,
        roleId: input.roleId || null,
        callTime: input.callTime,
        endTime: input.endTime,
        venueLocation: input.venueLocation,
        status: "scheduled",
        standardHours,
        overtimeHours,
        hourlyRate,
        laborCost,
        clientBillableRate,
        notes: input.notes || null,
        createdAt: new Date(),
        updatedAt: new Date(),
    });

    return {
        id: assignmentId,
        ...input,
        standardHours,
        overtimeHours,
        hourlyRate,
        laborCost,
    };
}

/**
 * Timesheet punch clock: processes actual check-in/out, calculates standard vs overtime pay
 */
export async function recordCrewTimesheet(
    assignmentId: string,
    data: { checkInAt?: Date; checkOutAt?: Date; status?: string; notes?: string }
) {
    const [assignment] = await db
        .select()
        .from(bookingCrewAssignments)
        .where(eq(bookingCrewAssignments.id, assignmentId));
    if (!assignment) throw new Error("Crew assignment not found");

    const checkIn = data.checkInAt || assignment.checkInAt || assignment.callTime;
    const checkOut = data.checkOutAt || assignment.checkOutAt || assignment.endTime;

    // Calculate actual worked hours
    const durationMs = checkOut.getTime() - checkIn.getTime();
    const actualHours = Math.max(0, Number((durationMs / (1000 * 60 * 60)).toFixed(2)));

    // Standard shift is up to 8h; anything beyond is overtime at 1.5x
    const standardHours = Math.min(actualHours, 8.0);
    const overtimeHours = Math.max(0, Number((actualHours - 8.0).toFixed(2)));

    let multiplier = 1.5;
    if (assignment.roleId) {
        const [role] = await db.select().from(eventCrewRoles).where(eq(eventCrewRoles.id, assignment.roleId));
        if (role) multiplier = role.overtimeMultiplier;
    }

    const laborCost = Number(((standardHours * assignment.hourlyRate) + (overtimeHours * assignment.hourlyRate * multiplier)).toFixed(2));

    const nextStatus = data.status || (data.checkOutAt ? "completed" : data.checkInAt ? "checked_in" : assignment.status);

    await db
        .update(bookingCrewAssignments)
        .set({
            checkInAt: checkIn,
            checkOutAt: checkOut,
            standardHours,
            overtimeHours,
            laborCost,
            status: nextStatus,
            notes: data.notes ? (assignment.notes ? `${assignment.notes} | ${data.notes}` : data.notes) : assignment.notes,
            updatedAt: new Date(),
        })
        .where(eq(bookingCrewAssignments.id, assignmentId));

    return {
        assignmentId,
        actualHours,
        standardHours,
        overtimeHours,
        laborCost,
        status: nextStatus,
    };
}

/**
 * Generates an event Call Sheet document payload for production teams
 */
export async function generateBookingCallSheet(bookingId: string) {
    const [booking] = await db.select().from(bookings).where(eq(bookings.id, bookingId));
    if (!booking) throw new Error("Booking not found");

    const assignments = await db
        .select({
            id: bookingCrewAssignments.id,
            crewName: bookingCrewAssignments.crewName,
            roleName: eventCrewRoles.name,
            roleCode: eventCrewRoles.code,
            callTime: bookingCrewAssignments.callTime,
            endTime: bookingCrewAssignments.endTime,
            venueLocation: bookingCrewAssignments.venueLocation,
            status: bookingCrewAssignments.status,
            standardHours: bookingCrewAssignments.standardHours,
            overtimeHours: bookingCrewAssignments.overtimeHours,
            laborCost: bookingCrewAssignments.laborCost,
            notes: bookingCrewAssignments.notes,
        })
        .from(bookingCrewAssignments)
        .leftJoin(eventCrewRoles, eq(bookingCrewAssignments.roleId, eventCrewRoles.id))
        .where(eq(bookingCrewAssignments.bookingId, bookingId))
        .orderBy(bookingCrewAssignments.callTime);

    const totalLaborCost = assignments.reduce((sum, a) => sum + (a.laborCost || 0), 0);

    return {
        documentNumber: `CALL-SHEET-${booking.id.slice(0, 8).toUpperCase()}`,
        generatedAt: new Date().toISOString(),
        event: {
            id: booking.id,
            name: booking.projectName || "E3 Live Production",
            venue: assignments[0]?.venueLocation || booking.notes || "Qatar National Convention Centre (QNCC)",
            startDate: booking.startDate,
            endDate: booking.endDate,
            clientName: booking.customerName,
        },
        safetyGuidelines: [
            "Mandatory Steel-Toe Safety Boots during Bump-In & Load-Out",
            "High-Visibility Safety Vests required in Stage Rigging Zones",
            "Hard Hats required while overhead truss motor operations are active",
            "Show Dress Code: All-Black E3 Production Crew Attire from Doors Open",
            "Qatar Ministry of Labor Heat Protocol: Hydration breaks strictly enforced",
        ],
        contacts: {
            leadProductionManager: "Hamad Al-Kuwari (+974 5512 3499)",
            safetyOfficer: "Zayd Mansour (+974 6623 8811)",
            venueLogisticsGate: "Gate 4 Loading Dock / Security Desk",
        },
        crewRoster: assignments,
        totalCrewCount: assignments.length,
        totalLaborCost,
    };
}
