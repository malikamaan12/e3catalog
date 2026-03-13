import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { reviews, bookings, products, vendors } from "@/lib/db/schema";
import { eq, avg, count } from "drizzle-orm";

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { bookingId, rating, conditionScore, deliveryScore, comment } = body;

        if (!bookingId || !rating) {
            return NextResponse.json({ error: "Booking ID and overall rating are required." }, { status: 400 });
        }

        // 1. Verify the booking exists
        const booking = await db.query.bookings.findFirst({
            where: eq(bookings.id, bookingId),
            with: { product: true }
        });

        if (!booking) {
            return NextResponse.json({ error: "Invalid booking ID." }, { status: 404 });
        }

        // 2. Prevent duplicate reviews
        const existingReview = await db.query.reviews.findFirst({
            where: eq(reviews.bookingId, bookingId)
        });

        if (existingReview) {
            return NextResponse.json({ error: "A review for this booking has already been submitted." }, { status: 400 });
        }

        // 3. Save the Review
        await db.insert(reviews).values({
            id: crypto.randomUUID(),
            bookingId: booking.id,
            productId: booking.productId,
            vendorId: booking.product?.vendorId,
            userId: booking.userId, // Can be null for legacy/guest
            customerName: booking.customerName,
            rating: Number(rating),
            conditionScore: Number(conditionScore),
            deliveryScore: Number(deliveryScore),
            comment: comment || null,
        });

        // 4. Recalculate Product Averages
        const productStats = await db.select({
            avgRating: avg(reviews.rating),
            totalReviews: count()
        }).from(reviews).where(eq(reviews.productId, booking.productId));

        const newAvg = productStats[0]?.avgRating ? Number(productStats[0].avgRating).toFixed(1) : 5.0;
        const newCount = productStats[0]?.totalReviews || 0;

        await db.update(products).set({
            averageRating: Number(newAvg),
            reviewCount: newCount
        }).where(eq(products.id, booking.productId));

        // 5. Build Vendor Reliability Algorithm
        // The Vendor Reliability Engine aggregates the delivery, condition, and rating scores.
        if (booking.product?.vendorId) {
            const vendorStats = await db.select({
                avgRating: avg(reviews.rating),
                avgCondition: avg(reviews.conditionScore),
                avgDelivery: avg(reviews.deliveryScore)
            }).from(reviews).where(eq(reviews.vendorId, booking.product.vendorId));

            const vStats = vendorStats[0];

            if (vStats) {
                // Out of 5 -> scale to 100 max for delivery/condition
                const numRating = vStats.avgRating ? Number(vStats.avgRating) : 5.0;
                const numCond = vStats.avgCondition ? Math.round((Number(vStats.avgCondition) / 5) * 100) : 100;
                const numDel = vStats.avgDelivery ? Math.round((Number(vStats.avgDelivery) / 5) * 100) : 100;

                await db.update(vendors).set({
                    scoreRating: Number(numRating.toFixed(1)),
                    scoreCondition: numCond,
                    scoreDelivery: numDel
                }).where(eq(vendors.id, booking.product.vendorId));
            }
        }

        return NextResponse.json({ success: true });
        
    } catch (error) {
        console.error("Review Error:", error);
        return NextResponse.json({ error: "Failed to submit review" }, { status: 500 });
    }
}
