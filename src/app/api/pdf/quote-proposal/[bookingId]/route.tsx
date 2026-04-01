import { NextRequest, NextResponse } from "next/server";
import { renderToStream } from "@react-pdf/renderer";
import React from "react";
import { db } from "@/lib/db";
import { bookings, products } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { QuoteProposalPDF } from "@/components/pdf/QuoteProposalPDF";
import { requireAdmin } from "@/lib/requireAdmin";
import { USER_ROLES } from "@/lib/constants";

export async function GET(
    req: NextRequest,
    { params }: { params: { bookingId: string } }
) {
    try {
        const { bookingId } = await params;

        // 1. RBAC Check
        const { user, error } = await requireAdmin([
            USER_ROLES.ADMIN, 
            USER_ROLES.SUPER_ADMIN, 
            USER_ROLES.SALES_REP,
            USER_ROLES.VENDOR
        ]);
        if (error) return error;

        // 2. Fetch Booking Data
        const [booking] = await db
            .select({
                id: bookings.id,
                projectName: bookings.projectName,
                customerName: bookings.customerName,
                customerEmail: bookings.customerEmail,
                customerPhone: bookings.customerPhone,
                status: bookings.status,
                totalPrice: bookings.totalPrice,
                units: bookings.units,
                discount: bookings.discount,
                logisticsCost: bookings.logisticsCost,
                laborCost: bookings.laborCost,
                paymentTerms: bookings.paymentTerms,
                product: {
                    name: products.name,
                    pricePerDay: products.pricePerDay,
                }
            })
            .from(bookings)
            .leftJoin(products, eq(bookings.productId, products.id))
            .where(eq(bookings.id, bookingId))
            .limit(1);

        if (!booking) {
            return NextResponse.json({ error: "Booking not found" }, { status: 404 });
        }

        // 3. Calculate Financials for PDF
        const subtotal = (booking.product?.pricePerDay || 0) * (booking.units || 1);
        const discountAmount = (subtotal * (booking.discount || 0)) / 100;
        const total = subtotal - discountAmount + (booking.logisticsCost || 0) + (booking.laborCost || 0);

        const financials = {
            subtotal,
            discount: booking.discount || 0,
            logistics: booking.logisticsCost || 0,
            setup: booking.laborCost || 0,
            total,
        };

        // 4. Render PDF to stream
        const stream = await renderToStream(
            <QuoteProposalPDF 
                booking={booking} 
                financials={financials} 
                paymentTerms={booking.paymentTerms || "100% Advance"} 
            />
        );

        // 5. Return PDF Response
        const response = new NextResponse(stream as any);
        response.headers.set("Content-Type", "application/pdf");
        response.headers.set(
            "Content-Disposition", 
            `attachment; filename="E3_Proposal_${booking.id.toUpperCase()}.pdf"`
        );

        return response;

    } catch (err: any) {
        console.error("[PDF_GEN_ERROR]", err);
        return NextResponse.json({ error: "Failed to generate PDF" }, { status: 500 });
    }
}
