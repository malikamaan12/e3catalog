/**
 * E3 Rentals — Centralized Persistent Notification & Outbox Engine
 * 
 * Features:
 * - Immediate in-app notification insertion
 * - Idempotency key tracking to eliminate duplicates
 * - Exponential backoff retry governance
 * - Delivery history & audit trail
 */

import { db } from "./db";
import { notifications, notificationOutbox } from "./db/schema";
import { eq, and, or, lte, inArray } from "drizzle-orm";
import { v4 as uuid } from "uuid";
import { sendEmail } from "./email";
import { sendWhatsAppMessage, sendSmsMessage } from "./whatsapp";

export interface DispatchNotificationParams {
    eventType: string;
    recipientId: string;
    recipientEmail?: string;
    recipientPhone?: string;
    channel?: "in_app" | "email" | "whatsapp" | "sms";
    title: string;
    message: string;
    type?: string;
    templateName?: string;
    payload?: Record<string, any>;
    correlationId?: string;
    bookingId?: string;
    idempotencyKey?: string;
}

export interface NotificationDispatchResult {
    notificationId: string;
    outboxId: string;
    status: "pending" | "sent_to_provider" | "delivered" | "suppressed";
    isDuplicate?: boolean;
}

/**
 * Dispatches a notification idempotently to in-app stream and development outbox.
 */
export async function dispatchNotification(params: DispatchNotificationParams): Promise<NotificationDispatchResult> {
    const notificationId = uuid();
    const outboxId = params.idempotencyKey || uuid();
    const correlationId = params.correlationId || uuid();

    // Idempotency check: if an outbox row exists with this ID/idempotency key, return existing state
    if (params.idempotencyKey) {
        const [existing] = await db
            .select()
            .from(notificationOutbox)
            .where(eq(notificationOutbox.id, params.idempotencyKey))
            .limit(1);

        if (existing) {
            return {
                notificationId: existing.id,
                outboxId: existing.id,
                status: existing.status as any,
                isDuplicate: true,
            };
        }
    }

    // 1. In-app notification
    await db.insert(notifications).values({
        id: notificationId,
        userId: params.recipientId,
        bookingId: params.bookingId,
        title: params.title,
        message: params.message,
        type: params.type || params.eventType,
        channel: params.channel || "in_app",
        isRead: false,
        createdAt: new Date(),
    });

    // 2. Outbox entry
    const payload = params.payload || { title: params.title, message: params.message };
    const initialStatus = "sent_to_provider";

    await db.insert(notificationOutbox).values({
        id: outboxId,
        eventType: params.eventType,
        recipientId: params.recipientId,
        recipientEmail: params.recipientEmail,
        recipientPhone: params.recipientPhone,
        channel: params.channel || "in_app",
        templateName: params.templateName || "default",
        payload,
        status: initialStatus,
        providerResponse: { accepted: true, channel: params.channel || "in_app", timestamp: new Date().toISOString() },
        retryCount: 0,
        correlationId,
        scheduledFor: new Date(),
        sentAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
    });

    return {
        notificationId,
        outboxId,
        status: initialStatus,
    };
}

/**
 * Processes queued outbox items with exponential backoff retries.
 */
export async function processNotificationOutbox(batchLimit = 20): Promise<{ processed: number; succeeded: number; failed: number }> {
    const now = new Date();

    const pendingItems = await db
        .select()
        .from(notificationOutbox)
        .where(
            and(
                inArray(notificationOutbox.status, ["pending", "retrying"]),
                lte(notificationOutbox.scheduledFor, now)
            )
        )
        .limit(batchLimit);

    let succeeded = 0;
    let failed = 0;

    for (const item of pendingItems) {
        try {
            if (item.channel === "email" && item.recipientEmail) {
                const payload = (item.payload as Record<string, any>) || {};
                const res = await sendEmail({
                    to: item.recipientEmail,
                    subject: payload.subject || "E3 Rentals Notification",
                    html: payload.html || `<p>${payload.message || "Notification from E3 Rentals"}</p>`,
                    text: payload.text || payload.message,
                    idempotencyKey: item.id,
                });

                if (res.success) {
                    await db
                        .update(notificationOutbox)
                        .set({
                            status: "delivered",
                            deliveredAt: new Date(),
                            updatedAt: new Date(),
                            providerResponse: { delivered: true, provider: res.provider },
                        })
                        .where(eq(notificationOutbox.id, item.id));
                    succeeded++;
                } else {
                    throw new Error(res.error || "Provider failed to send email");
                }
            } else if (item.channel === "whatsapp" && item.recipientPhone) {
                const payload = (item.payload as Record<string, any>) || {};
                const template = (item.templateName as any) || "deal_room_ready";
                const res = await sendWhatsAppMessage({
                    to: item.recipientPhone,
                    template,
                    params: payload,
                    idempotencyKey: item.id,
                });

                if (res.success) {
                    await db
                        .update(notificationOutbox)
                        .set({
                            status: "delivered",
                            deliveredAt: new Date(),
                            updatedAt: new Date(),
                            providerResponse: { delivered: true, provider: res.provider, messageId: res.messageId },
                        })
                        .where(eq(notificationOutbox.id, item.id));
                    succeeded++;
                } else {
                    throw new Error(res.error || "Failed to send WhatsApp notification");
                }
            } else if (item.channel === "sms" && item.recipientPhone) {
                const payload = (item.payload as Record<string, any>) || {};
                const res = await sendSmsMessage({
                    to: item.recipientPhone,
                    message: payload.message || payload.text || "Notification from E3 Rentals",
                    idempotencyKey: item.id,
                });

                if (res.success) {
                    await db
                        .update(notificationOutbox)
                        .set({
                            status: "delivered",
                            deliveredAt: new Date(),
                            updatedAt: new Date(),
                            providerResponse: { delivered: true, provider: res.provider, messageId: res.messageId },
                        })
                        .where(eq(notificationOutbox.id, item.id));
                    succeeded++;
                } else {
                    throw new Error(res.error || "Failed to send SMS notification");
                }
            } else {
                // In-app or other channel
                await db
                    .update(notificationOutbox)
                    .set({
                        status: "delivered",
                        deliveredAt: new Date(),
                        updatedAt: new Date(),
                    })
                    .where(eq(notificationOutbox.id, item.id));
                succeeded++;
            }
        } catch (err: any) {
            failed++;
            const nextRetry = (item.retryCount || 0) + 1;
            const isDeadLetter = nextRetry >= 3;

            // Exponential backoff: 1m, 4m, 9m...
            const backoffMs = Math.pow(nextRetry, 2) * 60 * 1000;
            const scheduledFor = new Date(Date.now() + backoffMs);

            await db
                .update(notificationOutbox)
                .set({
                    status: isDeadLetter ? "failed" : "retrying",
                    retryCount: nextRetry,
                    lastError: err.message?.substring(0, 950),
                    scheduledFor: isDeadLetter ? item.scheduledFor : scheduledFor,
                    updatedAt: new Date(),
                })
                .where(eq(notificationOutbox.id, item.id));
        }
    }

    return {
        processed: pendingItems.length,
        succeeded,
        failed,
    };
}
