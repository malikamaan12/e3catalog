import { db } from "./db";
import { products, bookings, inventoryOverrides, inventoryUnits } from "./db/schema";
import { eq, and, or, lte, gte, inArray, ne } from "drizzle-orm";
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
 * Core Availability Engine
 * 
 * Handles:
 * 1. Basic date overlap detection
 * 2. Buffer days (installation + dismantling time)
 * 3. Multi-shift same-day turnarounds with hour-level precision
 * 4. Manual inventory overrides (maintenance, manual holds)
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
    // Support both ISO strings and potentially other formats from various browsers
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
    //    Overlap condition: effectiveStart <= booking.effectiveEnd AND effectiveEnd >= booking.effectiveStart
    //    Only count approved and booked statuses
    //    We explicitly IGNORE request, quote_sent, cancelled, undelivered
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

    // 4. Implement Sweep-Line Algorithm to find true PEAK simultaneous overlapping bookings
    // Instead of naively adding every overlapping booking (which fails if two bookings overlap the requested window
    // but don't overlap *each other*), we plot every start and end event, then sweep chronologically.

    interface TimeEvent {
        time: Date;
        change: number;
    }

    let events: TimeEvent[] = [];

    for (const booking of overlappingBookings) {
        // CRITICAL: Ensure dates are Date objects before passing to date-fns.
        // Drizzle/pg can return timestamps as strings, and date-fns would
        // internally call e.toISOString() causing 'e.toISOString is not a function'.
        const bStartDate = booking.startDate instanceof Date ? booking.startDate : new Date(booking.startDate);
        const bEndDate = booking.endDate instanceof Date ? booking.endDate : new Date(booking.endDate);

        let bookingEffectiveStart = subHours(bStartDate, booking.bufferBefore || 0);
        let bookingEffectiveEnd = addHours(bEndDate, booking.bufferAfter || 0);

        // Advanced Multi-Shift Optimization
        // If the booking is same-day as the requested window and there is NO time overlap, we completely ignore it.
        if (req.startTime && req.endTime && booking.startTime && booking.endTime &&
            format(bStartDate, "yyyy-MM-dd") === format(bEndDate, "yyyy-MM-dd") &&
            req.startDate === format(bStartDate, "yyyy-MM-dd")) {

            const reqStartMinutes = timeToMinutes(req.startTime);
            const reqEndMinutes = timeToMinutes(req.endTime);
            const bookStartMinutes = timeToMinutes(booking.startTime);
            const bookEndMinutes = timeToMinutes(booking.endTime) + (cleaningHours * 60);

            if (reqStartMinutes >= bookEndMinutes || reqEndMinutes <= bookStartMinutes) {
                continue; // This specific booking does not overlap our exact hours
            }
        }

        // Clamp the window so we only evaluate peaks *within* our requested timeframe
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

    // Sort events chronologically. If times are identical, process subtractions (returns) BEFORE additions
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

    // 6. Query actual physical inventory units dynamically from Drizzle
    // Only count units that are in rentable condition
    const physicalUnits = await db.query.inventoryUnits.findMany({
        where: and(
            eq(inventoryUnits.productId, req.productId),
            inArray(inventoryUnits.conditionStatus, ["excellent", "good"]),
            ne(inventoryUnits.availabilityStatus, "in_maintenance")
        ),
    });

    const totalUnitsCount = physicalUnits.length;
    const unitsAvailable = totalUnitsCount - peakBooked;

    return {
        available: unitsAvailable >= req.quantity,
        unitsAvailable: Math.max(0, unitsAvailable),
        unitsBooked: peakBooked,
        unitsMaintenance: 0, // Injected via events sweep
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
 * 
 * OPTIMIZED: Fetches all data in ONE batch and processes in-memory to avoid N+1 bottlenecks.
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
        with: { inventoryUnits: true }
    });

    if (!product) return [];

    // Only count units that are in rentable condition
    const rentableUnits = product.inventoryUnits?.filter(u => 
        u.conditionStatus === "excellent" || u.conditionStatus === "good"
    ) || [];
    
    const totalUnitsCount = rentableUnits.length;
    const installHours = product.installTime || 0;
    const dismantleHours = product.dismantleTime || 0;

    // 2. FETCH ALL DATA IN BULK
    // Query all potentially overlapping bookings for the entire window
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

    // Query all manual overrides
    const overrides = await db.query.inventoryOverrides.findMany({
        where: and(
            eq(inventoryOverrides.productId, productId),
            lte(inventoryOverrides.startDate, endDate),
            gte(inventoryOverrides.endDate, today),
        ),
    });

    // 3. DAILY AGGREGATION
    // For a simple daily timeline, it's often faster to build a Map of days than to do complex sweeps if the range is small (30 days)
    const dailyBooked = new Map<string, number>();
    const dailyMaintenance = new Map<string, number>();

    // Process each day in the timeline
    const timeline: { date: string; available: number; booked: number; maintenance: number; total: number }[] = [];

    for (let i = 0; i < lookaheadDays; i++) {
        const currentDate = new Date(today);
        currentDate.setDate(today.getDate() + i);
        const dateStr = format(currentDate, "yyyy-MM-dd");

        // Start of day and end of day for this specific slot
        const dayStart = currentDate;
        const dayEnd = addHours(currentDate, 23.99);

        // Calculate peak booked for THIS day specifically
        // Any booking that overlaps (after adding its buffers) affects this day
        let peakForDay = 0;
        let maintenanceForDay = 0;

        // Note: For extreme performance with large numbers of bookings, we'd use a sweep-line here.
        // But for < 100 bookings per product, this direct check is very fast.
        for (const booking of allBookings) {
            // CRITICAL: Ensure dates are Date objects before passing to date-fns.
            const bStartDate = booking.startDate instanceof Date ? booking.startDate : new Date(booking.startDate);
            const bEndDate = booking.endDate instanceof Date ? booking.endDate : new Date(booking.endDate);

            const bookingEffStart = subHours(bStartDate, booking.bufferBefore || 0);
            const bookingEffEnd = addHours(bEndDate, booking.bufferAfter || 0);

            if (bookingEffStart <= dayEnd && bookingEffEnd >= dayStart) {
                peakForDay += booking.units;
            }
        }

        for (const over of overrides) {
            // CRITICAL: Ensure dates are Date objects.
            const oStart = over.startDate instanceof Date ? over.startDate : new Date(over.startDate);
            const oEnd = over.endDate instanceof Date ? over.endDate : new Date(over.endDate);
            if (oStart <= dayEnd && oEnd >= dayStart) {
                maintenanceForDay += over.unitsOffline;
            }
        }

        const totalBooked = peakForDay + maintenanceForDay;
        const available = Math.max(0, totalUnitsCount - totalBooked);

        timeline.push({
            date: dateStr,
            available,
            booked: peakForDay,
            maintenance: maintenanceForDay,
            total: totalUnitsCount,
        });
    }

    return timeline;
}
