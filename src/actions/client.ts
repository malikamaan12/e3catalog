"use server";

import { db } from "@/lib/db";
import { bookings, chatMessages } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/auth";
import { BOOKING_STATUS, USER_ROLES } from "@/lib/constants";

/**
 * Client-side action to approve a quote with a digital signature.
 * Strictly checks that the booking belongs to the authenticated client.
 */
export async function approveBookingWithSignature(bookingId: string, signatureData: string) {
    const user = await getCurrentUser();
    
    // Auth Check
    if (!user || user.role !== USER_ROLES.CLIENT) {
        return { error: "Unauthorized: Client access required" };
    }

    try {
        // Security: Ensure the booking belongs to this user
        const [booking] = await db
            .select({ id: bookings.id, userId: bookings.userId })
            .from(bookings)
            .where(and(
                eq(bookings.id, bookingId),
                eq(bookings.userId, user.id)
            ))
            .limit(1);

        if (!booking) {
            return { error: "Booking not found or access denied" };
        }

        // Atomic Update
        await db
            .update(bookings)
            .set({
                status: BOOKING_STATUS.APPROVED,
                signatureData,
                signedAt: new Date(),
                updatedAt: new Date(),
            })
            .where(eq(bookings.id, bookingId));

        // Revalidate relevant routes
        revalidatePath(`/dashboard/client/quote/${bookingId}`);
        revalidatePath(`/dashboard/client/overview`);
        revalidatePath(`/dashboard/sales/deal/${bookingId}`); // Force Sales Rep view to sync
        
        return { success: true };
    } catch (err) {
        console.error("[clientAction] approveBookingWithSignature failed:", err);
        return { error: "Failed to finalize approval" };
    }
}

/**
 * Send a message from the client portal regarding a specific booking.
 */
export async function sendClientMessage(bookingId: string, content: string) {
    const user = await getCurrentUser();
    if (!user) return { error: "Unauthorized" };

    try {
        // Security: Ensure the booking belongs to this user
        const [booking] = await db
            .select({ vendorId: bookings.vendorId, addedByAdmin: bookings.addedByAdmin })
            .from(bookings)
            .where(and(
                eq(bookings.id, bookingId),
                eq(bookings.userId, user.id)
            ))
            .limit(1);

        if (!booking) {
            return { error: "Access denied" };
        }

        // Determine receiver: Fallback to system admin if no specific vendor is assigned
        const receiverId = booking.addedByAdmin ? "system_admin" : (booking.vendorId || "system_admin");

        const messageId = crypto.randomUUID();

        await db.insert(chatMessages).values({
            id: messageId,
            senderId: user.id,
            receiverId: receiverId === "system_admin" ? "admin" : receiverId, // Adjust based on your admin user ID pattern
            bookingId,
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
