import { db } from "./db";
import { dealRooms, dealRoomAmendments, bookings, products, users } from "./db/schema";
import { eq, desc, and, sql } from "drizzle-orm";
import { v4 as uuidv4 } from "uuid";

// ─── Standard Interactive Event Proposal Add-Ons ───
export const DEAL_ROOM_ADDONS = [
    {
        id: "addon-crew",
        title: "Dedicated On-Site Senior Sound & Lighting Engineers",
        description: "Certified FOH audio engineer and lighting console director for live show operations and sound checks.",
        priceQar: 1800,
        category: "Technical Labor",
    },
    {
        id: "addon-flightcases",
        title: "Master Heavy-Duty Flight Casing & Pre-Wired Looms",
        description: "Tour-grade shockmount flight cases with multi-pin power looms for rapid 30-minute stage deployment.",
        priceQar: 650,
        category: "Packaging & Logistics",
    },
    {
        id: "addon-standby",
        title: "24/7 Redundant Hot-Swap Backup Units & Standby Tech",
        description: "Spare active speakers, wireless mics, and backup video processor stationed on standby at your venue.",
        priceQar: 1200,
        category: "Reliability & SLA",
    },
    {
        id: "addon-midnight-bumpin",
        title: "Priority Midnight Bump-In & Accelerated Load-Out",
        description: "Direct venue access scheduling between 00:00 - 06:00 to meet tight ballroom teardown windows.",
        priceQar: 950,
        category: "Logistics Priority",
    },
    {
        id: "addon-damage-waiver",
        title: "Zero-Deductible Event Damage & Weather Protection Waiver",
        description: "Comprehensive waiver covering accidental cosmetic damage, scratches, or outdoor dust ingress.",
        priceQar: 850,
        category: "Insurance",
    },
];

export interface CreateDealRoomOptions {
    bookingId: string;
    quoteId?: string;
    customSlug?: string;
    title?: string;
    accessPasscode?: string;
    branding?: {
        clientLogoUrl?: string;
        clientCompanyName?: string;
        primaryColorHex?: string;
        customWelcomeMessage?: string;
    };
    allowAmendments?: boolean;
}

/**
 * Creates or retrieves a white-label client interactive deal room for a booking/quotation
 */
export async function createOrGetDealRoom(options: CreateDealRoomOptions) {
    if (options.customSlug) {
        const [bySlug] = await db.select().from(dealRooms).where(eq(dealRooms.slug, options.customSlug));
        if (bySlug) return bySlug;
    } else {
        const [existing] = await db
            .select()
            .from(dealRooms)
            .where(eq(dealRooms.bookingId, options.bookingId));

        if (existing) {
            return existing;
        }
    }

    const [booking] = await db.select().from(bookings).where(eq(bookings.id, options.bookingId));
    if (!booking) throw new Error("Booking not found");

    const slug = options.customSlug || `e3-${(booking.projectName || "proposal").toLowerCase().replace(/[^a-z0-9]/g, "-")}-${uuidv4().slice(0, 6)}`;
    const title = options.title || `${booking.projectName || "Event Equipment Rental"} — Interactive Proposal`;

    const id = uuidv4();
    const newRoom = {
        id,
        bookingId: options.bookingId,
        quoteId: options.quoteId || null,
        slug,
        title,
        accessPasscode: options.accessPasscode || null,
        expiresAt: new Date(Date.now() + 14 * 86400000), // 14 days
        allowAmendments: options.allowAmendments ?? true,
        status: "active",
        viewCount: 0,
        brandingConfig: options.branding || {
            clientCompanyName: booking.customerName || "Valued Enterprise Partner",
            primaryColorHex: "#D4AF37",
            customWelcomeMessage: "Welcome to your customized E3 Rentals technical production and staging proposal.",
        },
        createdAt: new Date(),
        updatedAt: new Date(),
    };

    await db.insert(dealRooms).values(newRoom);
    return newRoom;
}

/**
 * Loads deal room data including technical gear specs, pricing line items, and add-on catalog
 */
export async function getDealRoomProposal(slug: string, passcode?: string) {
    const [room] = await db.select().from(dealRooms).where(eq(dealRooms.slug, slug));
    if (!room) throw new Error("Deal room proposal not found");

    if (room.accessPasscode && room.accessPasscode !== passcode) {
        return { isPasscodeRequired: true, title: room.title };
    }

    // Update view count
    await db
        .update(dealRooms)
        .set({
            viewCount: (room.viewCount || 0) + 1,
            lastViewedAt: new Date(),
        })
        .where(eq(dealRooms.id, room.id));

    // Fetch booking details & items
    let bookingData: any = null;
    let itemsData: any[] = [];

    if (room.bookingId) {
        const [b] = await db.select().from(bookings).where(eq(bookings.id, room.bookingId));
        bookingData = b;

        if (b) {
            const rawItems = await db
                .select({
                    id: bookings.id,
                    units: bookings.units,
                    startDate: bookings.startDate,
                    endDate: bookings.endDate,
                    productName: products.name,
                    pricePerDay: products.pricePerDay,
                    description: products.description,
                    dimensions: products.dimensions,
                    weight: products.weight,
                    powerRequirements: products.powerRequirements,
                })
                .from(bookings)
                .leftJoin(products, eq(bookings.productId, products.id))
                .where(
                    b.projectId
                        ? eq(bookings.projectId, b.projectId)
                        : eq(bookings.id, b.id)
                );

            itemsData = rawItems;
        }
    }

    // Fetch amendment history
    const amendments = await db
        .select()
        .from(dealRoomAmendments)
        .where(eq(dealRoomAmendments.dealRoomId, room.id))
        .orderBy(desc(dealRoomAmendments.createdAt));

    return {
        room,
        booking: bookingData,
        items: itemsData,
        availableAddons: DEAL_ROOM_ADDONS,
        amendments,
    };
}

/**
 * Submits a digital amendment / change request from the client deal room
 */
export async function submitDealRoomAmendment(params: {
    slug: string;
    requestedChanges: any[];
    proposedSubtotal?: number;
    clientComment?: string;
}) {
    const [room] = await db.select().from(dealRooms).where(eq(dealRooms.slug, params.slug));
    if (!room) throw new Error("Deal room not found");
    if (room.status === "locked" || room.status === "accepted") {
        throw new Error("This deal room is already locked/accepted. Amendments are disabled.");
    }

    const id = uuidv4();
    await db.insert(dealRoomAmendments).values({
        id,
        dealRoomId: room.id,
        requestedChanges: params.requestedChanges,
        proposedSubtotal: params.proposedSubtotal ?? 0,
        status: "pending",
        clientComment: params.clientComment || null,
        createdAt: new Date(),
    });

    return {
        id,
        status: "pending",
        message: "Your amendment request has been submitted to your E3 Production Lead for review.",
    };
}

/**
 * Client accepts the deal room proposal with legally binding digital signature
 */
export async function acceptDealRoomProposal(params: {
    slug: string;
    signerName: string;
    signerTitle: string;
    signatureDataUrl: string;
    selectedAddonIds?: string[];
}) {
    const [room] = await db.select().from(dealRooms).where(eq(dealRooms.slug, params.slug));
    if (!room) throw new Error("Deal room not found");

    if (room.status === "accepted") {
        return { success: true, message: "Proposal has already been signed and accepted." };
    }

    // Lock and accept deal room
    await db
        .update(dealRooms)
        .set({
            status: "accepted",
            updatedAt: new Date(),
        })
        .where(eq(dealRooms.id, room.id));

    // Update booking status to approved
    if (room.bookingId) {
        const [existingBooking] = await db.select({ notes: bookings.notes }).from(bookings).where(eq(bookings.id, room.bookingId));
        const signNote = `Signed via Deal Room by ${params.signerName} (${params.signerTitle})`;
        const updatedNotes = existingBooking?.notes ? `${existingBooking.notes} | ${signNote}` : signNote;

        await db
            .update(bookings)
            .set({
                status: "approved",
                notes: updatedNotes,
            })
            .where(eq(bookings.id, room.bookingId));
    }

    return {
        success: true,
        dealRoomId: room.id,
        signerName: params.signerName,
        signerTitle: params.signerTitle,
        signedAt: new Date().toISOString(),
        message: "Deal room signed and confirmed. Production reservation locked.",
    };
}
