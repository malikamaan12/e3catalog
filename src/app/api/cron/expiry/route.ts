import { NextResponse } from "next/server";
import { verifyCronSecret, withCronExecutionGovernance } from "@/lib/cron-governance";
import { db } from "@/lib/db";
import { bookings } from "@/lib/db/schema";
import { eq, and, lt } from "drizzle-orm";

export async function POST(req: Request) {
    if (!verifyCronSecret(req)) {
        return NextResponse.json({ error: "Unauthorized: Invalid or missing cron secret" }, { status: 401 });
    }

    const execution = await withCronExecutionGovernance(
        "quote_and_booking_expiry",
        "scheduled",
        undefined,
        async () => {
            const now = new Date();
            const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
            
            // Expire quotes/requests older than 7 days
            const expiredQuotes = await db.update(bookings)
                .set({ status: "cancelled" })
                .where(and(eq(bookings.status, "request"), lt(bookings.createdAt, sevenDaysAgo)))
                .returning();

            return {
                jobName: "quote_and_booking_expiry",
                itemsProcessed: expiredQuotes.length,
                itemsFailed: 0,
                details: { expiredQuoteCount: expiredQuotes.length },
            };
        }
    );

    if (!execution.success) {
        return NextResponse.json({ error: execution.message }, { status: 429 });
    }

    return NextResponse.json({ success: true, runId: execution.runId, result: execution.result });
}
