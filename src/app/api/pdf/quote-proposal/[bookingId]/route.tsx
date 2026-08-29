import { NextRequest, NextResponse } from "next/server";
import { renderToStream } from "@react-pdf/renderer";
import React from "react";
import { db } from "@/lib/db";
import { bookings, products } from "@/lib/db/schema";
import { eq, or, asc } from "drizzle-orm";
import { QuoteProposalPDF } from "@/components/pdf/QuoteProposalPDF";
import { getCurrentUser } from "@/lib/auth";
import { USER_ROLES } from "@/lib/constants";
import { calculateQuoteFinancials } from "@/lib/pricing";

export async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ bookingId: string }> }
) {
    try {
        const { bookingId } = await params;
        const currentUser = await getCurrentUser();

        // 1. Fetch All Booking Items for this project
        const bookingItems = await db.query.bookings.findMany({
            where: or(eq(bookings.id, bookingId), eq(bookings.projectId, bookingId)),
            with: {
                product: {
                    columns: {
                        name: true,
                        pricePerDay: true,
                        showPrice: true,
                        packagingFee: true,
                        handlingFee: true,
                        setupFee: true,
                    },
                },
            },
            orderBy: [asc(bookings.createdAt)],
        });

        if (!bookingItems || bookingItems.length === 0) {
            return NextResponse.json({ error: "Booking not found" }, { status: 404 });
        }

        const firstBooking = bookingItems[0];

        // 2. Authorization: Client can view their own quote; Admin/Sales/Vendor can view according to RBAC
        if (currentUser) {
            if (currentUser.role === USER_ROLES.CLIENT && firstBooking.userId && firstBooking.userId !== currentUser.id) {
                return NextResponse.json({ error: "Unauthorized: Access denied to this proposal" }, { status: 403 });
            }
        }

        // 3. Calculate Consolidated Financials
        const financials = calculateQuoteFinancials({
            items: bookingItems.map(b => ({
                id: b.id,
                productId: b.productId,
                name: b.product?.name || "Rental Asset",
                units: b.units,
                pricePerDay: b.product?.pricePerDay || 0,
                startDate: b.startDate,
                endDate: b.endDate,
                showPrice: b.product?.showPrice !== false,
                packagingFee: b.product?.packagingFee || 0,
                handlingFee: b.product?.handlingFee || 0,
                setupFee: b.product?.setupFee || 0,
            })),
            discountPercent: firstBooking.discount || 0,
            logisticsCost: firstBooking.logisticsCost || 0,
            laborCost: firstBooking.laborCost || 0,
        });

        // 4. Render PDF to stream
        const stream = await renderToStream(
            <QuoteProposalPDF 
                booking={{
                    ...firstBooking,
                    items: financials.items,
                }} 
                financials={financials} 
                paymentTerms={firstBooking.paymentTerms || "100% Advance"} 
            />
        );

        // 5. Return PDF Response
        const response = new NextResponse(stream as any);
        response.headers.set("Content-Type", "application/pdf");
        response.headers.set(
            "Content-Disposition", 
            `inline; filename="E3_Proposal_${(firstBooking.projectId || firstBooking.id).slice(0, 8).toUpperCase()}.pdf"`
        );

        return response;

    } catch (err: any) {
        console.error("[PDF_GEN_ERROR]", err);
        return NextResponse.json({ error: "Failed to generate PDF: " + (err.message || "Unknown error") }, { status: 500 });
    }
}
