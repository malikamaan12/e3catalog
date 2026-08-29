import { db } from "./db";
import { products, bookings, inventoryOverrides, inventoryUnits } from "./db/schema";
import { eq, and, or, lte, gte, inArray } from "drizzle-orm";
import { addHours, subHours, parseISO, format } from "date-fns";
import { BOOKING_STATUS } from "./constants";

export interface AvailabilityRequest {
    productId: string;
    startDate: string; // YYYY-MM-DD
    endDate: string;   // YYYY-MM-DD
    quantity: number;
    startTime?: string; // HH:mm — for multi-shift
    endTime?: string;   // HH:mm — for multi-shift
}

export interface AvailabilityResult {
    available: boolean;
    unitsAvailable: number;
    unitsBooked: number;
    unitsMaintenance: number;
    totalUnits: number;
    requestedQuantity: number;
    effectiveStart: string;
    effectiveEnd: string;
    conflictingBookings: number;
}

/**
 * Centralized Predicate: Determines whether a physical unit is allocatable and rentable.
 * Units in maintenance, offline, quarantined, damaged, fair, poor, or maintenance_required
 * are strictly non-allocatable.
 */
export function isUnitAllocatable(unit: {
    availabilityStatus?: string | null;
    conditionStatus?: string | null;
}): boolean {
    const nonAllocatableAvailability = [
        "in_maintenance",
        "maintenance",
        "offline",
        "quarantined",
        "retired",
        "decommissioned",
    ];
    const nonAllocatableConditions = [
        "maintenance_required",
        "damaged",
        "poor",
        "fair",
        "retired",
    ];

    if (unit.availabilityStatus && nonAllocatableAvailability.includes(unit.availabilityStatus.toLowerCase().trim())) {
        return false;
    }
    if (unit.conditionStatus && nonAllocatableConditions.includes(unit.conditionStatus.toLowerCase().trim())) {
        return false;
    }
    return true;
}

/**
 * Core Availability Engine
 * 
 * Handles:
 * 1. Basic date overlap detection
 * 2. Buffer days (installation + dismantling time)
 * 3. Multi-shift same-day turnarounds with hour-level precision
 * 4. Manual inventory overrides (maintenance, manual holds)
 * 5. Strict deduction of physical maintenance and non-allocatable units
 */
export async function checkAvailability(req: AvailabilityRequest): Promise<AvailabilityResult> {
    // 1. Fetch product details
    const product = await db.query.products.findFirst({
        where: eq(products.id, req.productId),
    });

    if (!product) {
        throw new Error(`Product not found: ${req.productId}`);
    }

    const installHours = product.installTime || 0;
    const dismantleHours = product.dismantleTime || 0;
    const cleaningHours = product.cleaningTime || 0;

    // 2. Calculate effective date window with buffer
    const parseDate = (d: any) => {
        const parsed = new Date(d);
        return isNaN(parsed.getTime()) ? parseISO(d) : parsed;
    };

    const requestedStart = parseDate(req.startDate);
    const requestedEnd = parseDate(req.endDate);

    if (isNaN(requestedStart.getTime()) || isNaN(requestedEnd.getTime())) {
        throw new Error("Invalid date format provided for availability check.");
    }

    const effectiveStart = subHours(requestedStart, installHours);
    const effectiveEnd = addHours(requestedEnd, dismantleHours);

    const effectiveStartStr = format(effectiveStart, "yyyy-MM-dd");
    const effectiveEndStr = format(effectiveEnd, "yyyy-MM-dd");

    // 3. Query all bookings that could overlap
    const overlappingBookings = await db.query.bookings.findMany({
        where: and(
            eq(bookings.productId, req.productId),
            inArray(bookings.status, [
                BOOKING_STATUS.APPROVED, 
                BOOKING_STATUS.BOOKED, 
                BOOKING_STATUS.QUOTE_ACCEPTED
            ]),
            lte(bookings.startDate, effectiveEnd),
            gte(bookings.endDate, effectiveStart),
        ),
    });

    // 4. Sweep-Line Algorithm to find true PEAK simultaneous overlapping bookings
    interface TimeEvent {
        time: Date;
        change: number;
    }

    let events: TimeEvent[] = [];

    for (const booking of overlappingBookings) {
        const bStartDate = booking.startDate instanceof Date ? booking.startDate : new Date(booking.startDate);
        const bEndDate = booking.endDate instanceof Date ? booking.endDate : new Date(booking.endDate);

        let bookingEffectiveStart = subHours(bStartDate, booking.bufferBefore || 0);
        let bookingEffectiveEnd = addHours(bEndDate, booking.bufferAfter || 0);

        // Multi-Shift Same-Day Optimization
        if (req.startTime && req.endTime && booking.startTime && booking.endTime &&
            format(bStartDate, "yyyy-MM-dd") === format(bEndDate, "yyyy-MM-dd") &&
            req.startDate === format(bStartDate, "yyyy-MM-dd")) {

            const reqStartMinutes = timeToMinutes(req.startTime);
            const reqEndMinutes = timeToMinutes(req.endTime);
            const bookStartMinutes = timeToMinutes(booking.startTime);
            const bookEndMinutes = timeToMinutes(booking.endTime) + (cleaningHours * 60);

            if (reqStartMinutes >= bookEndMinutes || reqEndMinutes <= bookStartMinutes) {
                continue;
            }
        }

        const eventStart = bookingEffectiveStart < effectiveStart ? effectiveStart : bookingEffectiveStart;
        const eventEnd = bookingEffectiveEnd > effectiveEnd ? effectiveEnd : bookingEffectiveEnd;

        events.push({ time: eventStart, change: booking.units });
        events.push({ time: eventEnd, change: -booking.units });
    }

    // 5. Query manual inventory overrides (maintenance/blocks)
    const overrides = await db.query.inventoryOverrides.findMany({
        where: and(
            eq(inventoryOverrides.productId, req.productId),
            lte(inventoryOverrides.startDate, effectiveEnd),
            gte(inventoryOverrides.endDate, effectiveStart),
        ),
    });

    for (const over of overrides) {
        const oStart = new Date(over.startDate);
        const oEnd = new Date(over.endDate);
        const overStart = oStart < effectiveStart ? effectiveStart : oStart;
        const overEnd = oEnd > effectiveEnd ? effectiveEnd : oEnd;
        events.push({ time: overStart, change: over.unitsOffline });
        events.push({ time: overEnd, change: -over.unitsOffline });
    }

    // Sort events chronologically
    events.sort((a, b) => {
        if (a.time.getTime() !== b.time.getTime()) {
            return a.time.getTime() - b.time.getTime();
        }
        return a.change - b.change;
    });

    let currentBooked = 0;
    let peakBooked = 0;

    for (const event of events) {
        currentBooked += event.change;
        if (currentBooked > peakBooked) {
            peakBooked = currentBooked;
        }
    }

    // 6. Query actual physical inventory units and apply isUnitAllocatable predicate
    const physicalUnits = await db.query.inventoryUnits.findMany({
        where: eq(inventoryUnits.productId, req.productId),
        columns: {
            id: true,
            availabilityStatus: true,
            conditionStatus: true,
        }
    });

    const totalUnitsCount = physicalUnits.length;
    const allocatableUnitsCount = physicalUnits.filter(isUnitAllocatable).length;
    const offlineUnitsCount = totalUnitsCount - allocatableUnitsCount;

    const unitsAvailable = Math.max(0, allocatableUnitsCount - peakBooked);

    return {
        available: unitsAvailable >= req.quantity,
        unitsAvailable: Math.max(0, unitsAvailable),
        unitsBooked: peakBooked,
        unitsMaintenance: offlineUnitsCount,
        totalUnits: totalUnitsCount,
        requestedQuantity: req.quantity,
        effectiveStart: effectiveStartStr,
        effectiveEnd: effectiveEndStr,
        conflictingBookings: overlappingBookings.length,
    };
}

/** Convert "HH:mm" to total minutes since midnight */
function timeToMinutes(time: string): number {
    const [hours, minutes] = time.split(":").map(Number);
    return hours * 60 + minutes;
}

/**
 * Calculates a day-by-day availability timeline for the next N days.
 */
export async function getAvailabilityTimeline(productId: string, lookaheadDays: number = 30, startDate?: string) {
    const parseDate = (d: any) => {
        const parsed = new Date(d);
        return isNaN(parsed.getTime()) ? parseISO(d) : parsed;
    };

    const today = startDate ? parseDate(startDate) : new Date();
    today.setHours(0, 0, 0, 0);

    const endDate = new Date(today);
    endDate.setDate(today.getDate() + lookaheadDays);

    // 1. Fetch Product and Physical Units
    const product = await db.query.products.findFirst({
        where: eq(products.id, productId),
        with: {
            inventoryUnits: {
                columns: {
                    id: true,
                    availabilityStatus: true,
                    conditionStatus: true,
                }
            }
        }
    });

    if (!product) return [];

    const units = product.inventoryUnits || [];
    const totalUnitsCount = units.length;
    const allocatableUnitsCount = units.filter(isUnitAllocatable).length;
    const offlineUnitsCount = totalUnitsCount - allocatableUnitsCount;

    // 2. FETCH ALL DATA IN BULK
    const allBookings = await db.query.bookings.findMany({
        where: and(
            eq(bookings.productId, productId),
            inArray(bookings.status, [
                BOOKING_STATUS.APPROVED, 
                BOOKING_STATUS.BOOKED, 
                BOOKING_STATUS.QUOTE_ACCEPTED
            ]),
            lte(bookings.startDate, endDate),
            gte(bookings.endDate, today),
        ),
    });

    const overrides = await db.query.inventoryOverrides.findMany({
        where: and(
            eq(inventoryOverrides.productId, productId),
            lte(inventoryOverrides.startDate, endDate),
            gte(inventoryOverrides.endDate, today),
        ),
    });

    // 3. DAILY AGGREGATION
    const timeline: { date: string; available: number; booked: number; maintenance: number; total: number }[] = [];

    for (let i = 0; i < lookaheadDays; i++) {
        const currentDate = new Date(today);
        currentDate.setDate(today.getDate() + i);
        const dateStr = format(currentDate, "yyyy-MM-dd");

        const dayStart = currentDate;
        const dayEnd = addHours(currentDate, 23.99);

        let peakForDay = 0;
        let maintenanceForDay = 0;

        for (const booking of allBookings) {
            const bStartDate = booking.startDate instanceof Date ? booking.startDate : new Date(booking.startDate);
            const bEndDate = booking.endDate instanceof Date ? booking.endDate : new Date(booking.endDate);

            const bookingEffStart = subHours(bStartDate, booking.bufferBefore || 0);
            const bookingEffEnd = addHours(bEndDate, booking.bufferAfter || 0);

            if (bookingEffStart <= dayEnd && bookingEffEnd >= dayStart) {
                peakForDay += booking.units;
            }
        }

        for (const over of overrides) {
            const oStart = over.startDate instanceof Date ? over.startDate : new Date(over.startDate);
            const oEnd = over.endDate instanceof Date ? over.endDate : new Date(over.endDate);
            if (oStart <= dayEnd && oEnd >= dayStart) {
                maintenanceForDay += over.unitsOffline;
            }
        }

        const totalUnavailable = peakForDay + maintenanceForDay;
        const available = Math.max(0, allocatableUnitsCount - totalUnavailable);

        timeline.push({
            date: dateStr,
            available,
            booked: peakForDay,
            maintenance: offlineUnitsCount + maintenanceForDay,
            total: totalUnitsCount,
        });
    }

    return timeline;
}
