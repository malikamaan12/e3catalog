import { db } from "./db";
import { notifications, notificationOutbox } from "./db/schema";
import { v4 as uuid } from "uuid";

export interface DispatchNotificationParams {
    eventType: string;
    recipientId: string;
    recipientEmail?: string;
    recipientPhone?: string;
    channel?: "in_app" | "email" | "whatsapp";
    title: string;
    message: string;
    type?: string;
    templateName?: string;
    payload?: Record<string, any>;
    correlationId?: string;
    bookingId?: string;
}

export interface NotificationDispatchResult {
    notificationId: string;
    outboxId: string;
    status: "pending" | "sent_to_provider" | "suppressed";
}

/**
 * Central notification dispatcher:
 * 1. Creates an in-app notification row for immediate client/admin consumption.
 * 2. Queues the event in the development outbox with lifecycle tracking.
 */
export async function dispatchNotification(params: DispatchNotificationParams): Promise<NotificationDispatchResult> {
    const notificationId = uuid();
    const outboxId = uuid();
    const correlationId = params.correlationId || uuid();

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

    // 2. Development Outbox
    const payload = params.payload || { title: params.title, message: params.message };
    
    // Status is 'sent_to_provider' if an adapter simulates external transmission, 'suppressed' if disabled
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
