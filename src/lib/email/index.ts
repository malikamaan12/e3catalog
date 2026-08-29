/**
 * E3 Rentals — Unified Email Dispatcher
 */

import { getEmailAdapter, SendEmailOptions, SendEmailResult } from "./adapter";
import { env } from "../env";

export * from "./adapter";

/**
 * Sends a transactional email using the configured or development adapter.
 */
export async function sendEmail(options: SendEmailOptions): Promise<SendEmailResult> {
    const adapter = getEmailAdapter();
    return await adapter.send(options);
}

/**
 * Sends a password reset email containing a secure one-time link.
 */
export async function sendPasswordResetEmail(email: string, rawToken: string, name = "User"): Promise<SendEmailResult> {
    const resetUrl = `${env.APP_URL}/reset-password?token=${encodeURIComponent(rawToken)}`;

    const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #0b0f19; color: #f3f4f6; padding: 40px 20px;">
        <div style="max-width: 560px; margin: 0 auto; background: #111827; border: 1px solid #1f2937; border-radius: 12px; padding: 32px;">
            <div style="text-align: center; margin-bottom: 24px;">
                <h1 style="color: #ffffff; font-size: 24px; font-weight: 800; margin: 0;">E3 Rentals</h1>
                <p style="color: #9ca3af; font-size: 14px; margin-top: 4px;">Password Reset Request</p>
            </div>
            <p style="color: #e5e7eb; font-size: 15px; line-height: 1.6;">Hello ${name},</p>
            <p style="color: #9ca3af; font-size: 14px; line-height: 1.6;">
                We received a request to reset your password for your E3 Rentals account. Click the button below to choose a new password. This link is valid for <strong>1 hour</strong> and can only be used once.
            </p>
            <div style="text-align: center; margin: 32px 0;">
                <a href="${resetUrl}" style="background: #3b82f6; color: #ffffff; padding: 14px 28px; border-radius: 8px; font-weight: 600; text-decoration: none; display: inline-block; font-size: 14px;">
                    Reset Password
                </a>
            </div>
            <p style="color: #6b7280; font-size: 12px; line-height: 1.5; margin-top: 24px; border-top: 1px solid #1f2937; padding-top: 16px;">
                If you did not request a password reset, you can safely ignore this email. Your password will not change until you access the link above and create a new one.
            </p>
        </div>
    </div>
    `;

    return await sendEmail({
        to: email,
        subject: "🔒 Reset Your E3 Rentals Password",
        html,
        text: `Reset your E3 Rentals password by visiting: ${resetUrl}`,
    });
}

/**
 * Sends an email address verification link.
 */
export async function sendEmailVerificationEmail(email: string, rawToken: string, name = "User"): Promise<SendEmailResult> {
    const verifyUrl = `${env.APP_URL}/verify-email?token=${encodeURIComponent(rawToken)}`;

    const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #0b0f19; color: #f3f4f6; padding: 40px 20px;">
        <div style="max-width: 560px; margin: 0 auto; background: #111827; border: 1px solid #1f2937; border-radius: 12px; padding: 32px;">
            <div style="text-align: center; margin-bottom: 24px;">
                <h1 style="color: #ffffff; font-size: 24px; font-weight: 800; margin: 0;">E3 Rentals</h1>
                <p style="color: #9ca3af; font-size: 14px; margin-top: 4px;">Verify Your Email Address</p>
            </div>
            <p style="color: #e5e7eb; font-size: 15px; line-height: 1.6;">Hello ${name},</p>
            <p style="color: #9ca3af; font-size: 14px; line-height: 1.6;">
                Thank you for registering with E3 Rentals. Please verify your email address to complete your account setup and activate all platform features.
            </p>
            <div style="text-align: center; margin: 32px 0;">
                <a href="${verifyUrl}" style="background: #10b981; color: #ffffff; padding: 14px 28px; border-radius: 8px; font-weight: 600; text-decoration: none; display: inline-block; font-size: 14px;">
                    Verify Email Address
                </a>
            </div>
            <p style="color: #6b7280; font-size: 12px; line-height: 1.5; margin-top: 24px; border-top: 1px solid #1f2937; padding-top: 16px;">
                Link: ${verifyUrl}
            </p>
        </div>
    </div>
    `;

    return await sendEmail({
        to: email,
        subject: "✉️ Verify Your E3 Rentals Account",
        html,
        text: `Verify your E3 Rentals email by visiting: ${verifyUrl}`,
    });
}
