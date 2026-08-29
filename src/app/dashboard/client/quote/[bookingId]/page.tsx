import { db } from "@/lib/db";
import { bookings } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { getCurrentUser } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import QuoteSignOffClient from "@/components/client/QuoteSignOffClient";

export const metadata = {
    title: "Digital Sign-Off Room | E3 Rentals",
    description: "Review and approve your commercial proposal.",
};

export default async function QuoteSignOffPage({ params }: { params: { bookingId: string } }) {
    const user = await getCurrentUser();
    if (!user) redirect("/login");

    const { bookingId } = await params;

    const booking = await db.query.bookings.findFirst({
        where: and(
            eq(bookings.id, bookingId),
            eq(bookings.userId, user.id)
        ),
        with: {
            product: true,
        }
    });

    if (!booking) {
        notFound();
    }

    // Prepare financials for PDF
    const subtotal = (booking.product?.pricePerDay || 0) * (booking.units || 1);
    const discount = booking.discount || 0;
    const logistics = booking.logisticsCost || 0;
    const labor = booking.laborCost || 0;
    const total = booking.totalPrice || 0;

    const financials = {
        subtotal,
        discount,
        logistics,
        setup: labor,
        total,
    };

    return (
        <div className="flex flex-col h-[calc(100vh-140px)] overflow-hidden">
            <QuoteSignOffClient 
                booking={booking} 
                financials={financials} 
                user={user} 
            />
        </div>
    );
}
