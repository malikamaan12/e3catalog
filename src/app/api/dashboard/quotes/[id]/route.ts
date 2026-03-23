import { db } from "@/lib/db";
import { bookings, products, vendors } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { sendQuoteStatusEmail } from "@/lib/email";
import { BOOKING_STATUS } from "@/lib/constants";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const user = await getCurrentUser();
        if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const { id } = await params;
        let queryProjectId = id;
        let queryVendorId: string | undefined = undefined;

        if (id.includes("::")) {
            [queryProjectId, queryVendorId] = id.split("::");
        }

        const userBookings = await db
            .select({
                booking: bookings,
                product: products,
                vendor: vendors
            })
            .from(bookings)
            .innerJoin(products, eq(bookings.productId, products.id))
            .leftJoin(vendors, eq(products.vendorId, vendors.id))
            .where(
                and(
                    eq(bookings.userId, user.id),
                    // Match either the direct booking ID or the projectId
                    // and if vendorId is specified, match that too
                )
            );

        // Filter for compatibility and specificity
        const quoteItems = userBookings.filter(b => {
            const matchesId = b.booking.projectId === queryProjectId || b.booking.id === queryProjectId;
            const matchesVendor = !queryVendorId || (b.booking.vendorId || "platform") === queryVendorId;
            return matchesId && matchesVendor;
        });

        if (quoteItems.length === 0) {
            return NextResponse.json({ error: "Quote not found or unauthorized" }, { status: 404 });
        }

        // Aggregate Data
        const firstBooking = quoteItems[0].booking;
        const status = firstBooking.status; // Assume all items in project have same status
        const projectName = firstBooking.projectName || "Quote Request";
        const projectId = firstBooking.projectId || firstBooking.id;

        // Sum financials
        let totalBaseRental = 0;
        let totalDiscount = firstBooking.discount || 0;
        let totalLogistics = firstBooking.logisticsCost || 0;
        let totalLabor = firstBooking.laborCost || 0;
        let additionalChargeName = firstBooking.additionalChargeName || null;
        let additionalChargeAmount = firstBooking.additionalChargeAmount || 0;
        let additionalChargeType = firstBooking.additionalChargeType || "fixed";
        let finalGrandTotal = firstBooking.totalPrice || null;
        const anyHidden = quoteItems.some(qi => qi.product.showPrice === false);

        const items = quoteItems.map(({ booking, product }) => {
            const start = new Date(booking.startDate);
            const end = new Date(booking.endDate);
            const days = Math.max(1, Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1);

            const lineBase = product.pricePerDay * booking.units * days;
            // Only add to base rental total if price is publicly shown
            if (product.showPrice !== false) {
                totalBaseRental += lineBase;
            }

            return {
                id: booking.id,
                productId: product.id,
                name: product.name,
                thumbnailUrl: product.thumbnailUrl,
                pricePerDay: product.pricePerDay,
                showPrice: product.showPrice !== false, // carry the flag to the frontend
                addedByAdmin: booking.addedByAdmin || false,
                adminItemNote: booking.adminItemNote || null,
                units: booking.units,
                startDate: booking.startDate,
                endDate: booking.endDate,
                days,
                lineBase
            };
        });

        const discountAmount = totalBaseRental * (totalDiscount / 100);
        let extraCharge = 0;
        if (additionalChargeAmount > 0) {
            switch (additionalChargeType) {
                case "percent":
                    extraCharge = (totalBaseRental - discountAmount) * (additionalChargeAmount / 100);
                    break;
                case "per_unit":
                    const totalUnits = items.reduce((acc, item) => acc + item.units, 0);
                    extraCharge = additionalChargeAmount * totalUnits;
                    break;
                case "per_day":
                    // Use max days spanning the event
                    const maxDays = Math.max(...items.map(i => i.days));
                    extraCharge = additionalChargeAmount * maxDays;
                    break;
                case "fixed":
                default:
                    extraCharge = additionalChargeAmount;
                    break;
            }
        }

        const subtotal = totalBaseRental - discountAmount + totalLogistics + totalLabor + extraCharge;
        const calculatedTotal = subtotal; // no tax

        return NextResponse.json({
            id: projectId,
            projectName,
            vendorName: quoteItems[0].vendor?.companyName || "E3 Rentals",
            status,
            createdAt: firstBooking.createdAt,
            notes: firstBooking.notes,
            adminNotes: firstBooking.adminNotes,
            clientNotes: firstBooking.clientNotes,
            items,
            financials: {
                baseRental: totalBaseRental,
                discountPercent: totalDiscount,
                discountAmount: discountAmount,
                logisticsCost: totalLogistics,
                laborCost: totalLabor,
                additionalChargeName,
                additionalChargeAmount,
                additionalChargeType,
                extraCharge,
                subtotal: (anyHidden && !firstBooking.totalPrice) ? "TBD" : subtotal,
                grandTotal: finalGrandTotal || (anyHidden ? "TBD" : calculatedTotal)
            }
        });

    } catch (error) {
        console.error("Dashboard Quote GET Error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const user = await getCurrentUser();
        if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const { id } = await params;
        const body = await request.json();
        const { status, clientNotes } = body;

        let queryProjectId = id;
        let queryVendorId: string | undefined = undefined;

        if (id.includes("::")) {
            [queryProjectId, queryVendorId] = id.split("::");
        }

        // Verify ownership
        const userBookings = await db.query.bookings.findMany({
            where: and(eq(bookings.userId, user.id))
        });
        const projectBookings = userBookings.filter(b => {
            const matchesId = b.projectId === queryProjectId || b.id === queryProjectId;
            const matchesVendor = !queryVendorId || (b.vendorId || "platform") === queryVendorId;
            return matchesId && matchesVendor;
        });

        if (projectBookings.length === 0) {
            return NextResponse.json({ error: "Quote not found or unauthorized" }, { status: 404 });
        }

        // Validate allowed status transitions by the client
        const allowedTransitions = [BOOKING_STATUS.CANCELLED, BOOKING_STATUS.QUOTE_ACCEPTED, BOOKING_STATUS.CHANGES_REQUESTED, BOOKING_STATUS.BOOKING_REQUESTED];
        if (status && !allowedTransitions.includes(status)) {
            return NextResponse.json({ error: "Invalid status transition" }, { status: 400 });
        }

        const updateData: any = { updatedAt: new Date() };
        if (status) updateData.status = status;
        if (clientNotes !== undefined) updateData.clientNotes = clientNotes;

        // Apply to all items in the project
        for (const booking of projectBookings) {
            await db.update(bookings)
                .set(updateData)
                .where(eq(bookings.id, booking.id));
        }

        // ── Email Confirmation to Client ────────────────────────────────────
        if (status && [BOOKING_STATUS.QUOTE_ACCEPTED, BOOKING_STATUS.CHANGES_REQUESTED, BOOKING_STATUS.CANCELLED].includes(status)) {
            const firstBooking = projectBookings[0];
            await sendQuoteStatusEmail({
                to: user.email,
                customerName: user.name,
                projectName: firstBooking.projectName || "Your Rental Request",
                projectId: firstBooking.projectId || firstBooking.id,
                status,
                startDate: (firstBooking.startDate instanceof Date) ? firstBooking.startDate.toISOString() : new Date(firstBooking.startDate).toISOString(),
                endDate: (firstBooking.endDate instanceof Date) ? firstBooking.endDate.toISOString() : new Date(firstBooking.endDate).toISOString(),
                totalPrice: firstBooking.totalPrice,
            });
        }
        // ───────────────────────────────────────────────────────────────────

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Dashboard Quote PATCH Error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
