import { db } from "./db";
import { bookings, products, vendors, vendorLedgers } from "./db/schema";
import { eq, or, and } from "drizzle-orm";
import { v4 as uuidv4 } from "uuid";

/**
 * Calculates and records the financial splits for a finalized quote/booking.
 * Should be called when a quote is formally 'approved'.
 */
export async function processBookingCommissions(projectIdOrId: string) {
    // 1. Fetch all booking items for this project
    const bookingItems = await db.query.bookings.findMany({
        where: or(eq(bookings.id, projectIdOrId), eq(bookings.projectId, projectIdOrId)),
        with: {
            product: {
                columns: { pricePerDay: true, vendorId: true },
            },
        },
    });

    if (!bookingItems.length) return;

    for (const item of bookingItems) {
        // Platform bookings (no vendor) don't need payouts
        const vId = item.vendorId || (item.product as any)?.vendorId;
        if (!vId || vId === "platform") continue;

        // Ensure we don't duplicate ledgers for the exact same booking line item
        const existingLedger = await db.query.vendorLedgers.findFirst({
            where: eq(vendorLedgers.bookingId, item.id)
        });

        if (existingLedger) continue; // Already processed

        // Fetch vendor's specific contract rate (default 20%)
        const vendorProfile = await db.query.vendors.findFirst({
            where: eq(vendors.id, vId)
        });
        
        const commissionRate = vendorProfile?.commissionRate ?? 20;

        const start = new Date(item.startDate);
        const end = new Date(item.endDate);
        const days = Math.max(1, Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)));
        
        // Calculate the base rental price of this specific line item
        const itemPricePerDay = (item.product as any)?.pricePerDay || 0;
        let amount = itemPricePerDay * item.units * days;
        
        // Let's account for discounts applied to the overall project proportionally?
        // For simplicity of MVP, ledger reflects base subtotal for the item. The platform absorbs global discounts.
        // Unless detailed itemized discounts are requested later.

        const platformFeePercentage = commissionRate / 100;
        const platformFee = amount * platformFeePercentage;
        const vendorPayout = amount - platformFee;

        // Insert ledger record
        await db.insert(vendorLedgers).values({
            id: uuidv4(),
            vendorId: vId,
            bookingId: item.id,
            projectId: item.projectId || item.id,
            amount: amount,
            commissionRate: commissionRate,
            platformFee: platformFee,
            vendorPayout: vendorPayout,
            status: "pending_payout",
            notes: "Auto-generated upon booking approval",
            createdAt: new Date(),
            updatedAt: new Date()
        });
    }
}
