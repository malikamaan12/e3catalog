import { db } from "@/lib/db";
import { bookings } from "@/lib/db/schema";
import { eq, and, or, asc } from "drizzle-orm";
import { getCurrentUser } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import QuoteSignOffClient from "@/components/client/QuoteSignOffClient";
import { calculateQuoteFinancials } from "@/lib/pricing";

export const dynamic = "force-dynamic";

export const metadata = {
    title: "Digital Sign-Off Room | E3 Rentals",
    description: "Review and approve your commercial proposal.",
};

export default async function QuoteSignOffPage({ params }: { params: Promise<{ bookingId: string }> }) {
    const user = await getCurrentUser();
    if (!user) redirect("/login");

    const { bookingId } = await params;

    // Fetch all booking items for this quote/project belonging to the client
    const allUserBookings = await db.query.bookings.findMany({
        where: and(
            eq(bookings.userId, user.id),
            or(eq(bookings.id, bookingId), eq(bookings.projectId, bookingId))
        ),
        with: {
            product: {
                columns: {
                    id: true,
                    name: true,
                    slug: true,
                    pricePerDay: true,
                    showPrice: true,
                    thumbnailUrl: true,
                    dimensions: true,
                    unit: true,
                    packagingFee: true,
                    handlingFee: true,
                    setupFee: true,
                },
                with: {
                    vendor: {
                        columns: {
                            id: true,
                            companyName: true,
                        },
                    },
                },
            },
        },
        orderBy: [asc(bookings.createdAt)],
    });

    if (!allUserBookings || allUserBookings.length === 0) {
        notFound();
    }

    const firstBooking = allUserBookings[0];
    const projectId = firstBooking.projectId || firstBooking.id;

    // Calculate consolidated financials using the authoritative pricing service
    const financials = calculateQuoteFinancials({
        items: allUserBookings.map(b => ({
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

    const unifiedBooking = {
        id: firstBooking.id,
        projectId,
        projectName: firstBooking.projectName || "Event Production Proposal",
        status: firstBooking.status,
        customerName: firstBooking.customerName,
        customerEmail: firstBooking.customerEmail,
        customerPhone: firstBooking.customerPhone,
        paymentTerms: firstBooking.paymentTerms || "100% Advance",
        signatureData: firstBooking.signatureData,
        signedAt: firstBooking.signedAt,
        startDate: firstBooking.startDate,
        endDate: firstBooking.endDate,
        items: allUserBookings,
    };

    return (
        <div className="flex flex-col h-[calc(100vh-140px)] overflow-hidden">
            <QuoteSignOffClient 
                booking={unifiedBooking} 
                financials={financials} 
                user={user} 
            />
        </div>
    );
}
