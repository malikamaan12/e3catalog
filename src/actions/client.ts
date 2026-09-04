"use server";

import { db } from "@/lib/db";
import { bookings, chatMessages, rentalAgreements } from "@/lib/db/schema";
import { eq, and, or } from "drizzle-orm";
import { v4 as uuid } from "uuid";
import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/auth";
import { BOOKING_STATUS, USER_ROLES } from "@/lib/constants";
import { validateProjectAvailability } from "@/lib/availability";
import { processBookingCommissions } from "@/lib/finance";
import { logStatusTransition } from "@/lib/state-machine";
import { sendQuoteStatusEmail } from "@/lib/email";

/**
 * Client-side action to approve a quote with a digital signature.
 * Strictly checks ownership, re-validates physical availability,
 * locks inventory, generates vendor ledgers, and logs audit history.
 */
export async function approveBookingWithSignature(bookingId: string, signatureData: string, clientQid?: string) {
    const user = await getCurrentUser();
    
    // Auth Check
    if (!user) {
        return { error: "Unauthorized: Please log in to approve this proposal" };
    }

    if (!signatureData || signatureData.length < 50) {
        return { error: "A valid digital signature is required to sign off on this commercial proposal." };
    }

    try {
        // 1. Fetch all items in this project quote (with client ownership check)
        const isStaff = [USER_ROLES.SUPER_ADMIN, USER_ROLES.ADMIN, USER_ROLES.SALES_REP].includes(user.role as any);
        const whereClause = isStaff
            ? or(eq(bookings.id, bookingId), eq(bookings.projectId, bookingId))
            : and(
                eq(bookings.userId, user.id),
                or(eq(bookings.id, bookingId), eq(bookings.projectId, bookingId))
            );

        const projectBookings = await db.query.bookings.findMany({
            where: whereClause,
        });

        if (projectBookings.length === 0) {
            return { error: "Booking proposal not found or access denied" };
        }

        const firstBooking = projectBookings[0];
        const projectId = firstBooking.projectId || firstBooking.id;

        // 2. State Check
        if ([BOOKING_STATUS.CANCELLED, BOOKING_STATUS.COMPLETED].includes(firstBooking.status as any)) {
            return { error: `This proposal is already ${firstBooking.status} and cannot be approved.` };
        }

        // Corporate Approval Gate: Prevent digital signing if internal corporate requisition is pending or rejected
        if (firstBooking.internalApprovalStatus === "pending_approval") {
            return { error: "This commercial proposal is currently pending internal corporate sign-off and cannot be signed yet." };
        }
        if (firstBooking.internalApprovalStatus === "rejected") {
            return { error: "This commercial proposal was rejected during internal corporate review." };
        }

        // 3. Authoritative Live Availability Revalidation before confirming
        const availabilityCheck = await validateProjectAvailability(
            projectBookings.map(b => ({
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
            return {
                error: `Cannot approve proposal due to an inventory conflict: ${conflictMsgs}`,
            };
        }

        const now = new Date();

        // 4. Atomic Transaction: Update status, persist signature, and lock inventory
        await db.transaction(async (tx) => {
            await tx
                .update(bookings)
                .set({
                    status: BOOKING_STATUS.APPROVED,
                    signatureData,
                    signedAt: now,
                    updatedAt: now,
                })
                .where(or(eq(bookings.id, projectId), eq(bookings.projectId, projectId)));
        });

        // 5. Auto-Generate & Sign Official Rental Agreement Record
        const existingAgr = await db.query.rentalAgreements.findFirst({
            where: eq(rentalAgreements.bookingId, firstBooking.id)
        });

        const agreementNumber = existingAgr?.agreementNumber || `AGR-${Date.now().toString(36).toUpperCase()}`;
        const replacementValueTotal = (firstBooking.totalPrice || 1000) * 8;
        const securityDepositAmount = (firstBooking.totalPrice || 1000) * 0.20;

        if (existingAgr) {
            await db.update(rentalAgreements)
                .set({
                    status: "signed",
                    signedByClientName: user.name || firstBooking.customerName || "Valued Client",
                    signedByClientQid: clientQid || null,
                    clientSignatureData: signatureData,
                    signedAt: now,
                    updatedAt: now,
                })
                .where(eq(rentalAgreements.id, existingAgr.id));
        } else {
            await db.insert(rentalAgreements).values({
                id: uuid(),
                agreementNumber,
                bookingId: firstBooking.id,
                projectId,
                clientId: user.id,
                status: "signed",
                contractTerms: "Standard E3 Rentals Qatar Master Equipment Rental Terms & Conditions",
                replacementValueTotal,
                securityDepositAmount,
                signedByClientName: user.name || firstBooking.customerName || "Valued Client",
                signedByClientQid: clientQid || null,
                clientSignatureData: signatureData,
                signedAt: now,
            });
        }

        // 6. Generate Vendor Financial Ledgers and Commission Receivables
        await processBookingCommissions(projectId).catch(console.error);

        // 7. Audit Log
        await logStatusTransition({
            actorId: user.id,
            targetId: projectId,
            fromStatus: firstBooking.status,
            toStatus: BOOKING_STATUS.APPROVED,
            role: "client",
            details: `Client digitally signed and approved proposal & rental agreement #${agreementNumber} (ref: #${projectId.slice(0, 8).toUpperCase()})`,
        });

        // 7. Send Email Confirmation
        if (user.email) {
            sendQuoteStatusEmail({
                to: user.email,
                customerName: user.name || "Valued Client",
                projectName: firstBooking.projectName || "Your Event Proposal",
                projectId,
                status: BOOKING_STATUS.APPROVED,
                startDate: firstBooking.startDate instanceof Date ? firstBooking.startDate.toISOString() : new Date(firstBooking.startDate).toISOString(),
                endDate: firstBooking.endDate instanceof Date ? firstBooking.endDate.toISOString() : new Date(firstBooking.endDate).toISOString(),
                totalPrice: firstBooking.totalPrice || 0,
            }).catch(console.error);
        }

        // 8. Revalidate paths
        revalidatePath(`/dashboard/client/quote/${bookingId}`);
        revalidatePath(`/dashboard/client/overview`);
        revalidatePath(`/dashboard/sales/deal/${bookingId}`);
        revalidatePath(`/dashboard/sales/pipeline`);
        revalidatePath(`/admin/bookings`);
        revalidatePath(`/admin/inventory`);
        
        return { success: true };
    } catch (err: any) {
        console.error("[clientAction] approveBookingWithSignature failed:", err);
        return { error: "Failed to finalize approval: " + (err.message || "Unknown error") };
    }
}

/**
 * Send a message from the client portal regarding a specific booking/project.
 */
export async function sendClientMessage(bookingId: string, content: string) {
    const user = await getCurrentUser();
    if (!user) return { error: "Unauthorized" };

    try {
        const [booking] = await db
            .select({ 
                id: bookings.id,
                projectId: bookings.projectId,
                vendorId: bookings.vendorId, 
                addedByAdmin: bookings.addedByAdmin 
            })
            .from(bookings)
            .where(and(
                eq(bookings.userId, user.id),
                or(eq(bookings.id, bookingId), eq(bookings.projectId, bookingId))
            ))
            .limit(1);

        if (!booking) {
            return { error: "Access denied" };
        }

        const receiverId = booking.addedByAdmin ? "system_admin" : (booking.vendorId || "system_admin");
        const messageId = crypto.randomUUID();

        await db.insert(chatMessages).values({
            id: messageId,
            senderId: user.id,
            receiverId: receiverId === "system_admin" ? "admin" : receiverId,
            bookingId: booking.id,
            projectId: booking.projectId || booking.id,
            content,
            createdAt: new Date(),
        });

        revalidatePath(`/dashboard/client/quote/${bookingId}`);
        return { success: true, id: messageId };
    } catch (err) {
        console.error("[clientAction] sendClientMessage failed:", err);
        return { error: "Failed to transmit message" };
    }
}
