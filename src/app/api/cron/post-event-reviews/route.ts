import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { bookings, products, vendors, reviews } from "@/lib/db/schema";
import { eq, inArray, and, lte, isNull } from "drizzle-orm";
import { sendReviewRequestEmail } from "@/lib/email";

function verifyCronAuth(req: Request): boolean {
    const cronSecret = process.env.CRON_SECRET;
    if (!cronSecret) return true;
    const authHeader = req.headers.get("authorization");
    const xSecret = req.headers.get("x-cron-secret");
    return authHeader === `Bearer ${cronSecret}` || xSecret === cronSecret;
}

export async function POST(req: Request) {
    return handleCron(req);
}

export async function GET(req: Request) {
    return handleCron(req);
}

async function handleCron(req: Request) {
    if (!verifyCronAuth(req)) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const now = new Date();
        now.setHours(0, 0, 0, 0);

        // Calculate yesterday's date to only target bookings that finished exactly yesterday
        const yesterday = new Date(now);
        yesterday.setDate(yesterday.getDate() - 1);
        yesterday.setHours(0, 0, 0, 0);

        // Find bookings that are 'booked' or 'approved' and ended exactly yesterday
        // We also check that a review hasn't already been submitted just in case
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
                // Filter for those that ended before today
                lte(bookings.endDate, now)
            )
        );

        let emailsSent = 0;
        const dispatchPromises = [];

        // Check which ones we actually need to email
        // To prevent spamming, we check if the difference between endDate and today is exactly 1 day
        // Or if you want to be safe, just get the ones where we don't have a review yet, and maybe flag them. 
        // For now, checking diff = -1 (ended yesterday).
        for (const b of eligibleBookings) {
            const endDate = new Date(b.endDate);
            endDate.setHours(0, 0, 0, 0);
            
            const diffTime = endDate.getTime() - now.getTime();
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            
            // Only send if the event ended exactly yesterday
            if (diffDays === -1) {
                
                // Double check if a review exists
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
                            vendorName: b.vendorName || "E3 Rentals", // Fallback if no vendor
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
