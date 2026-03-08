import { db } from "./db";
import { products, bookings, inventoryOverrides, inventoryUnits } from "./db/schema";
import { eq, and, or, lte, gte, inArray } from "drizzle-orm";
import { addHours, subHours, parseISO, format } from "date-fns";

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
    //    effectiveStart = requestedStart - installTime
    //    effectiveEnd = requestedEnd + dismantleTime
    const requestedStart = parseISO(req.startDate);
    const requestedEnd = parseISO(req.endDate);

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
            inArray(bookings.status, ["approved", "booked"]),
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
        let bookingEffectiveStart = subHours(booking.startDate, booking.bufferBefore || 0);
        let bookingEffectiveEnd = addHours(booking.endDate, booking.bufferAfter || 0);

        // Advanced Multi-Shift Optimization
        // If the booking is same-day as the requested window and there is NO time overlap, we completely ignore it.
        if (req.startTime && req.endTime && booking.startTime && booking.endTime &&
            format(booking.startDate, "yyyy-MM-dd") === format(booking.endDate, "yyyy-MM-dd") &&
            req.startDate === format(booking.startDate, "yyyy-MM-dd")) {

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
        const overStart = over.startDate < effectiveStart ? effectiveStart : over.startDate;
        const overEnd = over.endDate > effectiveEnd ? effectiveEnd : over.endDate;
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
    const physicalUnits = await db.query.inventoryUnits.findMany({
        where: eq(inventoryUnits.productId, req.productId),
    });

    const totalUnitsCount = physicalUnits.length > 0 ? physicalUnits.length : ((product as any).inventoryUnits?.length || 0);
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
 * Returns an array of available units per date.
 * Does not check time windows — returns the MINIMUM available stock for each day.
 */
export async function getAvailabilityTimeline(productId: string, lookaheadDays: number = 30, startDate?: string) {
    const today = startDate ? parseISO(startDate) : new Date();
    // Normalize to start of day
    today.setHours(0, 0, 0, 0);

    const timeline: { date: string; available: number; booked: number; maintenance: number; total: number }[] = [];

    // First, check product total units
    const product = await db.query.products.findFirst({
        where: eq(products.id, productId),
        with: { inventoryUnits: true }
    });

    if (!product) return timeline;

    // Loop through the days to check
    for (let i = 0; i < lookaheadDays; i++) {
        const currentDate = new Date(today);
        currentDate.setDate(today.getDate() + i);
        const dateStr = format(currentDate, "yyyy-MM-dd");

        // Call the core engine for a 1-day block
        // (This naturally handles the padding for install/dismantle buffers required even for a 1-day rental)
        const dayCheck = await checkAvailability({
            productId: productId,
            startDate: dateStr,
            endDate: dateStr,
            quantity: 1, // Quantity doesn't matter for the raw unit count
        });

        timeline.push({
            date: dateStr,
            available: dayCheck.unitsAvailable,
            booked: dayCheck.unitsBooked,
            maintenance: dayCheck.unitsMaintenance,
            total: (product as any).inventoryUnits?.length || 0,
        });
    }

    return timeline;
}
