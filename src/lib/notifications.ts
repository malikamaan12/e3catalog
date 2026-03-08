/**
 * Notification Service Wrapper
 * This acts as an architectural placeholder and wrapper for external messaging services.
 * Specifically designed for WhatsApp Cloud API (e.g. Infobip, Twilio, or Meta direct)
 * and transactional emails (Resend / AWS SES).
 */

export interface NotificationPayload {
    recipientIds: string[]; // User IDs or phone numbers
    type: 'whatsapp' | 'email' | 'in_app' | 'all';
    templateName?: string;
    message: string;
    data?: Record<string, any>;
}

export const notificationService = {
    /**
     * Send an expiration alert or a system notification
     */
    async sendAlert(payload: NotificationPayload) {
        console.log(`[NOTIFICATION_SERVICE] Preparing ${payload.type} alert...`);
        console.log(`[NOTIFICATION_SERVICE] Message: ${payload.message}`);

        if (payload.type === 'whatsapp' || payload.type === 'all') {
            await this.sendWhatsApp(payload);
        }

        if (payload.type === 'email' || payload.type === 'all') {
            await this.sendEmail(payload);
        }

        return { success: true };
    },

    async sendWhatsApp(payload: NotificationPayload) {
        // TODO: Implement actual WhatsApp Cloud API POST request here
        // Example: POST https://graph.facebook.com/v17.0/PHONE_NUMBER_ID/messages
        console.log(`📱 [WhatsApp API Stub] Sent to ${payload.recipientIds.length} recipients.`);
    },

    async sendEmail(payload: NotificationPayload) {
        // TODO: Implement actual Resend or AWS SES email trigger here
        console.log(`📧 [Email API Stub] Sent to ${payload.recipientIds.length} recipients.`);
    }
};
