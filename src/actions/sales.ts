"use server";

import { db } from "@/lib/db";
import { bookings, chatMessages } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/auth";
import { USER_ROLES } from "@/lib/constants";

export async function updateBookingQuote(bookingId: string, data: {
    totalPrice?: number;
    discount?: number;
    logisticsCost?: number;
    laborCost?: number;
    additionalChargeAmount?: number;
    additionalChargeName?: string;
    paymentTerms?: string;
    selectedTerms?: string[];
    status?: string;
}) {
    const user = await getCurrentUser();
    if (!user || ![USER_ROLES.SALES_REP, USER_ROLES.ADMIN, USER_ROLES.SUPER_ADMIN].includes(user.role as any)) {
        throw new Error("Unauthorized");
    }

    await db
        .update(bookings)
        .set({
            ...data,
            updatedAt: new Date(),
        })
        .where(eq(bookings.id, bookingId));

    revalidatePath(`/dashboard/sales/deal/${bookingId}`);
    revalidatePath("/dashboard/sales/pipeline");
    return { success: true };
}

export async function sendNegotiationMessage(bookingId: string, receiverId: string, content: string) {
    const user = await getCurrentUser();
    if (!user) throw new Error("Unauthorized");

    const messageId = crypto.randomUUID();

    await db.insert(chatMessages).values({
        id: messageId,
        senderId: user.id,
        receiverId,
        bookingId,
        content,
        createdAt: new Date(),
    });

    revalidatePath(`/dashboard/sales/deal/${bookingId}`);
    return { success: true, id: messageId };
}
