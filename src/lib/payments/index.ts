/**
 * E3 Rentals — Centralized Payment Processing & Webhook Engine
 */

import { getPaymentAdapter, CreatePaymentIntentParams, PaymentIntentResult, WebhookVerificationParams, WebhookVerificationResult } from "./adapter";
import { db } from "../db";
import { processedWebhooks, bookings, clientPayments } from "../db/schema";
import { eq } from "drizzle-orm";
import { v4 as uuid } from "uuid";
import * as crypto from "crypto";

export * from "./adapter";

/**
 * Creates a payment intent via configured or mock provider.
 */
export async function createPayment(params: CreatePaymentIntentParams): Promise<PaymentIntentResult> {
    const adapter = getPaymentAdapter();
    return await adapter.createPaymentIntent(params);
}

/**
 * Verifies webhook signature with constant-time comparison and timestamp tolerance.
 */
export async function verifyPaymentWebhook(
    provider: string,
    params: WebhookVerificationParams
): Promise<WebhookVerificationResult> {
    const adapter = getPaymentAdapter(provider);
    return await adapter.verifyWebhookSignature(params);
}

/**
 * Processes a verified webhook idempotently against the database.
 */
export async function processVerifiedWebhookEvent(
    provider: string,
    event: { id: string; type: string; timestamp: number; data: Record<string, any> },
    rawBody: string
): Promise<{ success: boolean; alreadyProcessed: boolean; message: string }> {
    // 1. Check idempotency table
    const [existing] = await db
        .select()
        .from(processedWebhooks)
        .where(eq(processedWebhooks.webhookId, event.id))
        .limit(1);

    if (existing) {
        return {
            success: true,
            alreadyProcessed: true,
            message: `Webhook ${event.id} already processed at ${existing.processedAt}`,
        };
    }

    const payloadHash = crypto.createHash("sha256").update(rawBody).digest("hex");

    // 2. Record webhook in processed_webhooks
    await db.insert(processedWebhooks).values({
        id: uuid(),
        webhookId: event.id,
        provider,
        eventType: event.type,
        status: "processed",
        payloadHash,
        metadata: event.data,
        processedAt: new Date(),
    });

    // 3. Trigger state transitions if payment succeeded
    if (event.type === "payment_intent.succeeded" || event.type === "checkout.session.completed") {
        const bookingId = event.data.bookingId || event.data.metadata?.bookingId;
        const amount = Number(event.data.amount) || Number(event.data.amount_received) || 0;

        if (bookingId) {
            await db
                .update(bookings)
                .set({
                    paymentStatus: "paid",
                    updatedAt: new Date(),
                })
                .where(eq(bookings.id, bookingId));

            // Record client payment
            await db.insert(clientPayments).values({
                id: uuid(),
                paymentNumber: `PAY-${Date.now()}-${uuid().substring(0, 4).toUpperCase()}`,
                bookingId,
                amount: amount || 0,
                paymentMethod: provider,
                transactionRef: event.id,
                status: "verified",
                notes: `Automatic webhook settlement from ${provider}`,
                paymentDate: new Date(),
                createdAt: new Date(),
                updatedAt: new Date(),
            });
        }
    }

    return {
        success: true,
        alreadyProcessed: false,
        message: `Webhook ${event.id} processed successfully`,
    };
}
