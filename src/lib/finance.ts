import { db } from "./db";
import { bookings, products, vendors, vendorLedgers, commissionSettlements } from "./db/schema";
import { eq, or, and } from "drizzle-orm";
import { v4 as uuidv4 } from "uuid";

import { calculateRentalDays } from "./pricing";

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

        const vendorProfile = await db.query.vendors.findFirst({
            where: eq(vendors.id, vId)
        });
        
        if (!vendorProfile) continue;

        const cType = vendorProfile.commissionType || "percentage";
        const cVal = vendorProfile.commissionValue ?? 20;
        
        // Ensure we don't duplicate settlements for the exact same booking run
        const existingSettlement = await db.query.commissionSettlements.findFirst({
            where: and(
                eq(commissionSettlements.bookingId, item.id),
                eq(commissionSettlements.vendorId, vId)
            )
        });

        if (existingSettlement) continue;

        const days = calculateRentalDays(item.startDate, item.endDate);
        const itemPricePerDay = (item.product as any)?.pricePerDay || 0;
        let amount = item.totalPrice || (itemPricePerDay * item.units * days);
        
        // Let's account for discounts applied to the overall project proportionally?
        // For simplicity of MVP, ledger reflects base subtotal for the item. The platform absorbs global discounts.
        // Unless detailed itemized discounts are requested later.

        // ─── Calculate Debt to Platform ───
        
        let platformFee = 0;

        if (cType === "percentage") {
            platformFee = amount * (cVal / 100);
        } else if (cType === "fixed_per_item") {
            platformFee = cVal * item.units * days;
        } else if (cType === "per_project_fee") {
            platformFee = cVal;
        } else if (cType === "fixed_monthly") {
            // Subscription based - debts generated via a separate chron job, not per booking.
            platformFee = 0;
        }

        const vendorPayout = amount - platformFee;

        // ─── Insert settlement (Receivables) ───
        if (platformFee > 0) {
            await db.insert(commissionSettlements).values({
                id: uuidv4(),
                vendorId: vId,
                bookingId: item.id,
                amountOwed: platformFee,
                status: "pending",
                adminNotes: `Generated via ${cType} rule at ${cVal}`,
                createdAt: new Date(),
                updatedAt: new Date()
            });
        }

        // Insert ledger record
        await db.insert(vendorLedgers).values({
            id: uuidv4(),
            vendorId: vId,
            bookingId: item.id,
            projectId: item.projectId || item.id,
            amount: amount,
            commissionRate: cVal,
            platformFee: platformFee,
            vendorPayout: vendorPayout,
            status: "pending_payout",
            notes: "Auto-generated upon booking approval",
            createdAt: new Date(),
            updatedAt: new Date()
        });
    }
}
