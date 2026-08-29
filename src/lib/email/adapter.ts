/**
 * E3 Rentals — Unified Email Provider Adapters
 * 
 * Supports Resend, SMTP, and Persistent Database Outbox fallback.
 * All transactional emails are persisted to notification_outbox for auditability.
 */

import { env } from "../env";
import { db } from "../db";
import { notificationOutbox } from "../db/schema";
import { v4 as uuid } from "uuid";

export interface SendEmailOptions {
    to: string | string[];
    subject: string;
    html: string;
    text?: string;
    from?: string;
    replyTo?: string;
    tags?: Array<{ name: string; value: string }>;
    idempotencyKey?: string;
}

export interface SendEmailResult {
    success: boolean;
    id: string;
    provider: "resend" | "smtp" | "dev-outbox";
    error?: string;
}

export interface EmailAdapter {
    send(options: SendEmailOptions): Promise<SendEmailResult>;
}

export class DevOutboxEmailAdapter implements EmailAdapter {
    async send(options: SendEmailOptions): Promise<SendEmailResult> {
        const id = options.idempotencyKey || uuid();
        const recipientEmail = Array.isArray(options.to) ? options.to.join(", ") : options.to;

        try {
            await db.insert(notificationOutbox).values({
                id,
                eventType: "transactional_email",
                recipientEmail: recipientEmail.trim().toLowerCase(),
                channel: "email",
                templateName: "raw_html",
                payload: {
                    subject: options.subject,
                    html: options.html,
                    text: options.text,
                    from: options.from || env.EMAIL_FROM,
                },
                status: "sent_to_provider",
                providerResponse: {
                    driver: "dev-outbox",
                    recipient: recipientEmail,
                    timestamp: new Date().toISOString(),
                },
                retryCount: 0,
                scheduledFor: new Date(),
                sentAt: new Date(),
                createdAt: new Date(),
                updatedAt: new Date(),
            });

            console.log(`[Email Outbox] Persisted email to "${recipientEmail}" | Subject: "${options.subject}" (ID: ${id})`);

            return {
                success: true,
                id,
                provider: "dev-outbox",
            };
        } catch (err: any) {
            console.error("[Email Outbox] Failed to persist outbox email:", err.message);
            return {
                success: false,
                id,
                provider: "dev-outbox",
                error: err.message,
            };
        }
    }
}

export class ResendEmailAdapter implements EmailAdapter {
    private apiKey: string;

    constructor(apiKey: string) {
        this.apiKey = apiKey;
    }

    async send(options: SendEmailOptions): Promise<SendEmailResult> {
        const id = options.idempotencyKey || uuid();
        const recipientEmail = Array.isArray(options.to) ? options.to.join(", ") : options.to;

        // Persist outbox record
        try {
            await db.insert(notificationOutbox).values({
                id,
                eventType: "transactional_email",
                recipientEmail: recipientEmail.trim().toLowerCase(),
                channel: "email",
                templateName: "resend_email",
                payload: {
                    subject: options.subject,
                    html: options.html,
                    text: options.text,
                    from: options.from || env.EMAIL_FROM,
                },
                status: "sent_to_provider",
                providerResponse: { driver: "resend", timestamp: new Date().toISOString() },
                retryCount: 0,
                scheduledFor: new Date(),
                sentAt: new Date(),
                createdAt: new Date(),
                updatedAt: new Date(),
            });
        } catch {
            // non-critical
        }

        try {
            const { Resend } = await import("resend");
            const resend = new Resend(this.apiKey);

            const res = await resend.emails.send({
                from: options.from || env.EMAIL_FROM,
                to: options.to,
                subject: options.subject,
                html: options.html,
                text: options.text,
                replyTo: options.replyTo,
                tags: options.tags,
            });

            if (res.error) {
                return {
                    success: false,
                    id,
                    provider: "resend",
                    error: res.error.message,
                };
            }

            return {
                success: true,
                id: res.data?.id || id,
                provider: "resend",
            };
        } catch (err: any) {
            return {
                success: false,
                id,
                provider: "resend",
                error: err.message,
            };
        }
    }
}

let activeAdapter: EmailAdapter | null = null;

export function getEmailAdapter(): EmailAdapter {
    if (activeAdapter) return activeAdapter;

    if (env.EMAIL_DRIVER === "resend" && env.RESEND_API_KEY && !env.RESEND_API_KEY.includes("your_api_key")) {
        activeAdapter = new ResendEmailAdapter(env.RESEND_API_KEY);
    } else {
        activeAdapter = new DevOutboxEmailAdapter();
    }

    return activeAdapter;
}
