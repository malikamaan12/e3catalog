import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { bookings, products, vendors, reviews } from "@/lib/db/schema";
import { eq, inArray, and, lte } from "drizzle-orm";
import { sendReviewRequestEmail } from "@/lib/email";
import { verifyCronAuthorization, methodNotAllowedResponse, unauthorizedCronResponse } from "@/lib/cron-auth";

export const dynamic = "force-dynamic";

/**
 * GET is strictly forbidden on cron mutating routes.
 * Returns HTTP 405 Method Not Allowed with Allow: POST header.
 */
export async function GET() {
    return methodNotAllowedResponse();
}

/**
 * POST handler strictly requires Bearer token or x-cron-secret matching CRON_SECRET.
 */
export async function POST(req: NextRequest) {
    if (!verifyCronAuthorization(req)) {
        return unauthorizedCronResponse();
    }

    try {
        const now = new Date();
        now.setHours(0, 0, 0, 0);

        const yesterday = new Date(now);
        yesterday.setDate(yesterday.getDate() - 1);
        yesterday.setHours(0, 0, 0, 0);

        const eligibleBookings = await db.select({
            bookingId: bookings.id,
            customerName: bookings.customerName,
            customerEmail: bookings.customerEmail,
            endDate: bookings.endDate,
            productId: products.id,
            productName: products.name,
            vendorName: vendors.companyName,
        })
        .from(bookings)
        .innerJoin(products, eq(bookings.productId, products.id))
        .leftJoin(vendors, eq(products.vendorId, vendors.id))
        .where(
            and(
                inArray(bookings.status, ["booked", "approved"]),
                lte(bookings.endDate, now)
            )
        );

        let emailsSent = 0;
        const dispatchPromises = [];

        for (const b of eligibleBookings) {
            const endDate = new Date(b.endDate);
            endDate.setHours(0, 0, 0, 0);
            
            const diffTime = endDate.getTime() - now.getTime();
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            
            if (diffDays === -1) {
                const existingReview = await db.query.reviews.findFirst({
                    where: eq(reviews.bookingId, b.bookingId)
                });

                if (!existingReview && b.customerEmail) {
                    emailsSent++;
                    dispatchPromises.push(
                        sendReviewRequestEmail({
                            to: b.customerEmail,
                            customerName: b.customerName,
                            bookingId: b.bookingId,
                            productName: b.productName,
                            vendorName: b.vendorName || "E3 Rentals",
                        })
                    );
                }
            }
        }

        await Promise.allSettled(dispatchPromises);

        return NextResponse.json({ 
            success: true, 
            message: `Processed post-event flow. Sent ${emailsSent} review request emails.` 
        });

    } catch (error) {
        console.error("Post-Event Cron Error:", error);
        return NextResponse.json({ error: "Failed to process post-event cron" }, { status: 500 });
    }
}
