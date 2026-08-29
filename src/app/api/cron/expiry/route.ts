import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { bookings, safetyCertificates, products, users } from "@/lib/db/schema";
import { and, eq, lte, or } from "drizzle-orm";
import { notificationService } from "@/lib/notifications";
import { verifyCronAuthorization, methodNotAllowedResponse, unauthorizedCronResponse } from "@/lib/cron-auth";

export const dynamic = "force-dynamic";

/**
 * GET is strictly forbidden on cron mutating routes to prevent unauthenticated execution.
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
        const results = {
            expiredQuotes: 0,
            expiringCertificates: 0,
        };

        const now = new Date();

        // ---------------------------------------------------------
        // A. QUOTE EXPIRATION (72 Hours)
        // ---------------------------------------------------------
        const expiryLimit = new Date();
        expiryLimit.setHours(expiryLimit.getHours() - 72);

        // Find and update quotes strictly older than 72 hours
        const expiredQuotes = await db
            .update(bookings)
            .set({
                status: "cancelled",
                adminNotes: "System Auto-Cancelled: Quote Expired after 72 hours.",
                updatedAt: new Date()
            })
            .where(
                and(
                    or(eq(bookings.status, "quote_sent"), eq(bookings.status, "changes_requested")),
                    lte(bookings.updatedAt, expiryLimit)
                )
            )
            .returning();

        results.expiredQuotes = expiredQuotes.length;

        // Send alerts to users about quote expiry
        for (const quote of expiredQuotes) {
            await notificationService.sendAlert({
                recipientIds: [quote.userId || quote.customerEmail],
                type: 'all',
                message: `Your quote for ${quote.projectName} has expired. Please contact us to generate a new quote.`,
            });
        }

        // ---------------------------------------------------------
        // B. SAFETY CERTIFICATE NOTIFICATIONS (30 Days)
        // ---------------------------------------------------------
        const thirtyDaysFromNow = new Date();
        thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);

        const expiringCerts = await db
            .select({
                id: safetyCertificates.id,
                certName: safetyCertificates.certName,
                certNumber: safetyCertificates.certNumber,
                expiryDate: safetyCertificates.expiryDate,
                productName: products.name,
                vendorId: products.vendorId
            })
            .from(safetyCertificates)
            .innerJoin(products, eq(safetyCertificates.productId, products.id))
            .where(lte(safetyCertificates.expiryDate, thirtyDaysFromNow));

        results.expiringCertificates = expiringCerts.length;

        if (expiringCerts.length > 0) {
            const superAdmins = await db.select().from(users).where(eq(users.role, "super_admin"));
            const adminIds = superAdmins.map(a => a.id);

            await notificationService.sendAlert({
                recipientIds: adminIds,
                type: 'all',
                message: `SYSTEM ALERT: ${expiringCerts.length} Safety Certificates are expiring within 30 days. Action required.`
            });
        }

        return NextResponse.json({ success: true, processed: results });
    } catch (error) {
        console.error("Cron Expiry Execution Error:", error);
        return NextResponse.json({ error: "Job execution failed" }, { status: 500 });
    }
}
