import { db } from "@/lib/db";
import { bookings } from "@/lib/db/schema";
import { eq, and, or } from "drizzle-orm";
import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { sendQuoteStatusEmail } from "@/lib/email";
import { BOOKING_STATUS } from "@/lib/constants";
import { validateProjectAvailability } from "@/lib/availability";
import { processBookingCommissions } from "@/lib/finance";
import { logStatusTransition } from "@/lib/state-machine";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const user = await getCurrentUser();
        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const resolvedParams = await params;
        const id = resolvedParams.id;

        // Fetch all bookings for this project/id belonging to user
        const targetBookings = await db.query.bookings.findMany({
            where: and(
                eq(bookings.userId, user.id),
                or(eq(bookings.id, id), eq(bookings.projectId, id))
            ),
        });

        if (targetBookings.length === 0) {
            return NextResponse.json({ error: "Quote not found or unauthorized" }, { status: 404 });
        }

        const firstBooking = targetBookings[0];
        const projectId = firstBooking.projectId || firstBooking.id;

        if ([BOOKING_STATUS.CANCELLED, BOOKING_STATUS.COMPLETED].includes(firstBooking.status as any)) {
            return NextResponse.json({ 
                error: `Quote cannot be approved from its current status: ${firstBooking.status}` 
            }, { status: 400 });
        }

        // Live availability check before locking
        const availabilityCheck = await validateProjectAvailability(
            targetBookings.map(b => ({
                productId: b.productId,
                units: b.units,
                startDate: b.startDate,
                endDate: b.endDate,
                startTime: b.startTime || undefined,
                endTime: b.endTime || undefined,
            })),
            { excludeProjectId: projectId }
        );

        if (!availabilityCheck.valid) {
            const conflictMsgs = availabilityCheck.conflicts.map(c => c.error).join(" ");
            return NextResponse.json({
                error: `Cannot approve quote due to stock conflict: ${conflictMsgs}`,
                conflicts: availabilityCheck.conflicts,
            }, { status: 409 });
        }

        const now = new Date();

        // Atomic Transaction: update status
        await db.transaction(async (tx) => {
            await tx.update(bookings)
                .set({ status: BOOKING_STATUS.APPROVED, updatedAt: now })
                .where(or(eq(bookings.id, projectId), eq(bookings.projectId, projectId)));
        });

        // Generate vendor ledgers and commission receivables
        await processBookingCommissions(projectId).catch(console.error);

        // Audit Log
        await logStatusTransition({
            actorId: user.id,
            targetId: projectId,
            fromStatus: firstBooking.status,
            toStatus: BOOKING_STATUS.APPROVED,
            role: "client",
            details: `Client approved proposal (ref: #${projectId.slice(0, 8).toUpperCase()})`,
        });

        // Send Email Confirmation to Client
        if (user.email) {
            sendQuoteStatusEmail({
                to: user.email,
                customerName: user.name || "Valued Client",
                projectName: firstBooking.projectName || "Your Event Proposal",
                projectId,
                status: BOOKING_STATUS.APPROVED,
                startDate: firstBooking.startDate instanceof Date 
                    ? firstBooking.startDate.toISOString() 
                    : new Date(firstBooking.startDate).toISOString(),
                endDate: firstBooking.endDate instanceof Date 
                    ? firstBooking.endDate.toISOString() 
                    : new Date(firstBooking.endDate).toISOString(),
                totalPrice: firstBooking.totalPrice || 0,
            }).catch(console.error);
        }

        return NextResponse.json({ 
            success: true, 
            message: "Quote successfully approved and inventory locked.",
            projectId,
        });

    } catch (error: any) {
        console.error("[QUOTE_APPROVE_POST] Error:", error);
        return NextResponse.json({ error: "Internal Server Error", detail: error?.message }, { status: 500 });
    }
}
