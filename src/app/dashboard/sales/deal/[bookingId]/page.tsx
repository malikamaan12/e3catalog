import { db } from "@/lib/db";
import { bookings, chatMessages, products, users } from "@/lib/db/schema";
import { eq, asc, desc } from "drizzle-orm";
import { getCurrentUser } from "@/lib/auth";
import { notFound } from "next/navigation";
import DealRoomClient from "./DealRoomClient";

export default async function DealRoomPage({ params }: { params: { bookingId: string } }) {
    const { bookingId } = await params;
    const currentUser = await getCurrentUser();
    if (!currentUser) return null;

    // 1. Fetch Booking with Product
    const [booking] = await db
        .select({
            id: bookings.id,
            projectName: bookings.projectName,
            customerName: bookings.customerName,
            status: bookings.status,
            totalPrice: bookings.totalPrice,
            units: bookings.units,
            startDate: bookings.startDate,
            endDate: bookings.endDate,
            paymentTerms: bookings.paymentTerms,
            discount: bookings.discount,
            logisticsCost: bookings.logisticsCost,
            laborCost: bookings.laborCost,
            userId: bookings.userId,
            product: {
                name: products.name,
                pricePerDay: products.pricePerDay,
                thumbnailUrl: products.thumbnailUrl,
            }
        })
        .from(bookings)
        .leftJoin(products, eq(bookings.productId, products.id))
        .where(eq(bookings.id, bookingId))
        .limit(1);

    if (!booking) notFound();

    // 2. Fetch Chat History
    const messages = await db
        .select()
        .from(chatMessages)
        .where(eq(chatMessages.bookingId, bookingId))
        .orderBy(asc(chatMessages.createdAt));

    return (
        <DealRoomClient 
            booking={booking} 
            messages={messages} 
            currentUser={currentUser} 
        />
    );
}
