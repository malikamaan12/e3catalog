"use server";

import { db } from "@/lib/db";
import { bookings, chatMessages, products, users } from "@/lib/db/schema";
import { eq, or, and, ne } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/auth";
import { USER_ROLES, BOOKING_STATUS } from "@/lib/constants";
import { v4 as uuid } from "uuid";
import { checkAvailability } from "@/lib/availability";
import { sendQuoteStatusEmail } from "@/lib/email";
import { logStatusTransition } from "@/lib/state-machine";

export async function updateBookingQuote(projectIdOrId: string, data: {
    discount?: number;
    logisticsCost?: number;
    laborCost?: number;
    additionalChargeAmount?: number;
    additionalChargeName?: string;
    paymentTerms?: string;
    adminNotes?: string;
    status?: string;
    totalPrice?: number;
}) {
    const user = await getCurrentUser();
    if (!user || ![USER_ROLES.SALES_REP, USER_ROLES.ADMIN, USER_ROLES.SUPER_ADMIN].includes(user.role as any)) {
        return { error: "Unauthorized: Sales representative or Admin access required" };
    }

    try {
        // Fetch existing quote items
        const existingItems = await db.query.bookings.findMany({
            where: or(eq(bookings.id, projectIdOrId), eq(bookings.projectId, projectIdOrId)),
        });

        if (existingItems.length === 0) {
            return { error: "Quote not found" };
        }

        const prevStatus = existingItems[0].status;
        const newStatus = data.status || prevStatus;

        const updateData: any = {
            updatedAt: new Date(),
        };

        if (data.discount !== undefined) updateData.discount = Number(data.discount) || 0;
        if (data.logisticsCost !== undefined) updateData.logisticsCost = Number(data.logisticsCost) || 0;
        if (data.laborCost !== undefined) updateData.laborCost = Number(data.laborCost) || 0;
        if (data.additionalChargeAmount !== undefined) updateData.additionalChargeAmount = Number(data.additionalChargeAmount) || 0;
        if (data.additionalChargeName !== undefined) updateData.additionalChargeName = data.additionalChargeName;
        if (data.paymentTerms !== undefined) updateData.paymentTerms = data.paymentTerms;
        if (data.adminNotes !== undefined) updateData.adminNotes = data.adminNotes;
        if (data.totalPrice !== undefined) updateData.totalPrice = Number(data.totalPrice) || 0;
        if (data.status !== undefined) updateData.status = data.status;

        // Update all booking items in the project
        await db
            .update(bookings)
            .set(updateData)
            .where(or(eq(bookings.id, projectIdOrId), eq(bookings.projectId, projectIdOrId)));

        // Audit log transition if status changed
        if (newStatus !== prevStatus) {
            await logStatusTransition({
                actorId: user.id,
                targetId: projectIdOrId,
                fromStatus: prevStatus,
                toStatus: newStatus,
                role: user.role,
                details: `Sales updated proposal status to ${newStatus}`,
            });
        }

        // If proposal is officially sent to client, send transactional notification
        if (data.status === BOOKING_STATUS.QUOTE_SENT && existingItems[0].customerEmail) {
            const first = existingItems[0];
            await sendQuoteStatusEmail({
                to: first.customerEmail,
                customerName: first.customerName || "Valued Customer",
                projectName: first.projectName || "Your Event Proposal",
                projectId: first.projectId || first.id,
                status: BOOKING_STATUS.QUOTE_SENT,
                startDate: first.startDate instanceof Date ? first.startDate.toISOString() : new Date(first.startDate).toISOString(),
                endDate: first.endDate instanceof Date ? first.endDate.toISOString() : new Date(first.endDate).toISOString(),
                totalPrice: data.totalPrice || first.totalPrice || 0,
                adminNote: data.adminNotes || undefined,
            }).catch(console.error);
        }

        revalidatePath(`/dashboard/sales/deal/${projectIdOrId}`);
        revalidatePath("/dashboard/sales/pipeline");
        revalidatePath(`/dashboard/client/quote/${projectIdOrId}`);
        return { success: true };
    } catch (err: any) {
        console.error("[updateBookingQuote] Error:", err);
        return { error: "Failed to update quote: " + (err.message || "Unknown error") };
    }
}

export async function addQuoteItem(projectIdOrId: string, item: {
    productId: string;
    units: number;
    startDate: string;
    endDate: string;
}) {
    const user = await getCurrentUser();
    if (!user || ![USER_ROLES.SALES_REP, USER_ROLES.ADMIN, USER_ROLES.SUPER_ADMIN].includes(user.role as any)) {
        return { error: "Unauthorized" };
    }

    try {
        const existingItems = await db.query.bookings.findMany({
            where: or(eq(bookings.id, projectIdOrId), eq(bookings.projectId, projectIdOrId)),
        });

        if (existingItems.length === 0) {
            return { error: "Quote not found" };
        }

        const ref = existingItems[0];

        // Check availability
        const avail = await checkAvailability({
            productId: item.productId,
            startDate: item.startDate,
            endDate: item.endDate,
            quantity: item.units,
        });

        if (!avail.available && avail.unitsAvailable < item.units) {
            return { error: `Only ${avail.unitsAvailable} unit${avail.unitsAvailable === 1 ? '' : 's'} available in stock.` };
        }

        const product = await db.query.products.findFirst({
            where: eq(products.id, item.productId),
        });

        if (!product) {
            return { error: "Product not found" };
        }

        const newId = uuid();
        await db.insert(bookings).values({
            id: newId,
            productId: item.productId,
            vendorId: product.vendorId,
            userId: ref.userId,
            projectId: ref.projectId || ref.id,
            projectName: ref.projectName,
            units: item.units,
            startDate: new Date(item.startDate),
            endDate: new Date(item.endDate),
            status: ref.status,
            paymentStatus: ref.paymentStatus,
            customerName: ref.customerName,
            customerEmail: ref.customerEmail,
            customerPhone: ref.customerPhone,
            discount: ref.discount,
            logisticsCost: ref.logisticsCost,
            laborCost: ref.laborCost,
            paymentTerms: ref.paymentTerms,
            addedByAdmin: true,
            createdAt: new Date(),
            updatedAt: new Date(),
        });

        revalidatePath(`/dashboard/sales/deal/${projectIdOrId}`);
        return { success: true, id: newId };
    } catch (err: any) {
        console.error("[addQuoteItem] Error:", err);
        return { error: "Failed to add item: " + (err.message || "Unknown error") };
    }
}

export async function removeQuoteItem(itemId: string, projectIdOrId: string) {
    const user = await getCurrentUser();
    if (!user || ![USER_ROLES.SALES_REP, USER_ROLES.ADMIN, USER_ROLES.SUPER_ADMIN].includes(user.role as any)) {
        return { error: "Unauthorized" };
    }

    try {
        const existingItems = await db.query.bookings.findMany({
            where: or(eq(bookings.id, projectIdOrId), eq(bookings.projectId, projectIdOrId)),
        });

        if (existingItems.length <= 1) {
            return { error: "Cannot remove the only item in a proposal. At least one line item is required." };
        }

        await db.delete(bookings).where(eq(bookings.id, itemId));

        revalidatePath(`/dashboard/sales/deal/${projectIdOrId}`);
        return { success: true };
    } catch (err: any) {
        console.error("[removeQuoteItem] Error:", err);
        return { error: "Failed to remove item: " + (err.message || "Unknown error") };
    }
}

export async function sendNegotiationMessage(bookingId: string, receiverId: string, content: string, projectId?: string) {
    const user = await getCurrentUser();
    if (!user) return { error: "Unauthorized" };

    const messageId = uuid();

    await db.insert(chatMessages).values({
        id: messageId,
        senderId: user.id,
        receiverId,
        bookingId,
        projectId: projectId || bookingId,
        content,
        createdAt: new Date(),
    });

    revalidatePath(`/dashboard/sales/deal/${bookingId}`);
    return { success: true, id: messageId };
}
