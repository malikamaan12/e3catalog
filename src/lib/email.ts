import { Resend } from "resend";

let resendInstance: Resend | null = null;

function getResend() {
    if (!resendInstance) {
        resendInstance = new Resend(process.env.RESEND_API_KEY);
    }
    return resendInstance;
}

const FROM = process.env.EMAIL_FROM || "E3 Rentals <noreply@e3rentals.com>";
const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";

// ─── Status Configs ──────────────────────────────────────────────────────────
const STATUS_CONFIG: Record<string, {
    subject: string;
    headline: string;
    subtext: string;
    accentColor: string;
    emoji: string;
    cta?: string;
    ctaUrl?: (projectId: string) => string;
}> = {
    quote_sent: {
        subject: "📋 Your Quote is Ready for Review",
        headline: "Your Quote is Ready!",
        subtext: "We've prepared your official quote. Please review the pricing details and accept to lock in your rental.",
        accentColor: "#F5A623",
        emoji: "📋",
        cta: "Review & Accept Quote",
        ctaUrl: (id) => `${BASE_URL}/dashboard/quote/${id}`,
    },
    approved: {
        subject: "✅ Booking Confirmed!",
        headline: "Your Booking is Confirmed!",
        subtext: "Great news! Your rental booking has been officially approved and confirmed by our team. We look forward to serving you.",
        accentColor: "#22C55E",
        emoji: "✅",
        cta: "View Booking Details",
        ctaUrl: (id) => `${BASE_URL}/dashboard/quote/${id}`,
    },
    cancelled: {
        subject: "❌ Booking Cancelled",
        headline: "Booking Cancelled",
        subtext: "Your rental request has been cancelled. If you have any questions or would like to reschedule, please contact us.",
        accentColor: "#EF4444",
        emoji: "❌",
        cta: "Browse Catalog",
        ctaUrl: () => `${BASE_URL}/catalog`,
    },
    changes_requested: {
        subject: "🔄 Revision Request Received",
        headline: "We've Got Your Revision Request",
        subtext: "Our team has received your revision request and will review it shortly. We'll update you once changes are processed.",
        accentColor: "#F97316",
        emoji: "🔄",
        cta: "View Quote",
        ctaUrl: (id) => `${BASE_URL}/dashboard/quote/${id}`,
    },
    quote_accepted: {
        subject: "🎉 Quote Accepted – Awaiting Confirmation",
        headline: "Quote Accepted!",
        subtext: "You've accepted the quote. Our team will now do a final review and confirm your booking shortly.",
        accentColor: "#3B82F6",
        emoji: "🎉",
        cta: "View Dashboard",
        ctaUrl: () => `${BASE_URL}/dashboard`,
    },
};

// ─── HTML Template ────────────────────────────────────────────────────────────
function buildEmailHTML(opts: {
    customerName: string;
    projectName: string;
    status: string;
    extraRows?: Array<{ label: string; value: string }>;
    adminNote?: string;
}) {
    const cfg = STATUS_CONFIG[opts.status];
    if (!cfg) return null;

    const detailRows = opts.extraRows?.map(r => `
        <tr>
            <td style="padding:8px 0;color:#94a3b8;font-size:13px;">${r.label}</td>
            <td style="padding:8px 0;color:#f1f5f9;font-size:13px;font-weight:600;text-align:right;">${r.value}</td>
        </tr>
    `).join("") || "";

    const adminNoteHtml = opts.adminNote ? `
        <div style="margin-top:24px;background:#1e293b;border-left:3px solid ${cfg.accentColor};border-radius:0 8px 8px 0;padding:16px 20px;">
            <p style="margin:0 0 6px;font-size:12px;text-transform:uppercase;letter-spacing:1px;color:${cfg.accentColor};font-weight:700;">Note from our team</p>
            <p style="margin:0;color:#cbd5e1;font-size:14px;line-height:1.6;">${opts.adminNote}</p>
        </div>
    ` : "";

    const ctaHtml = cfg.cta && cfg.ctaUrl ? `
        <div style="margin-top:32px;text-align:center;">
            <a href="${cfg.ctaUrl(opts.projectName)}" style="display:inline-block;background:${cfg.accentColor};color:#0a0f1e;font-weight:700;font-size:14px;padding:14px 32px;border-radius:10px;text-decoration:none;letter-spacing:0.5px;">
                ${cfg.cta} →
            </a>
        </div>
    ` : "";

    return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#0a0f1e;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
    <div style="max-width:600px;margin:0 auto;padding:32px 16px;">

        <!-- Header -->
        <div style="text-align:center;margin-bottom:32px;">
            <div style="display:inline-block;background:linear-gradient(135deg,#d4a843,#f5c842);border-radius:12px;padding:12px 16px;margin-bottom:16px;">
                <span style="font-size:24px;font-weight:900;color:#0a0f1e;letter-spacing:2px;">E3 RENTALS</span>
            </div>
        </div>

        <!-- Card -->
        <div style="background:#0f1729;border:1px solid #1e293b;border-radius:16px;overflow:hidden;">
            <!-- Status Banner -->
            <div style="background:${cfg.accentColor}18;border-bottom:1px solid ${cfg.accentColor}30;padding:24px 28px;text-align:center;">
                <div style="font-size:40px;margin-bottom:8px;">${cfg.emoji}</div>
                <h1 style="margin:0;color:#f1f5f9;font-size:22px;font-weight:700;">${cfg.headline}</h1>
                <p style="margin:8px 0 0;color:#94a3b8;font-size:14px;line-height:1.6;">${cfg.subtext}</p>
            </div>

            <!-- Body -->
            <div style="padding:28px;">
                <p style="margin:0 0 20px;color:#cbd5e1;font-size:15px;">Hi <strong style="color:#f1f5f9;">${opts.customerName}</strong>,</p>

                <!-- Project Details Table -->
                <div style="background:#1e293b;border-radius:10px;padding:16px 20px;">
                    <table style="width:100%;border-collapse:collapse;">
                        <tr>
                            <td style="padding:8px 0;color:#94a3b8;font-size:13px;">Project / Quote</td>
                            <td style="padding:8px 0;color:#f1f5f9;font-size:13px;font-weight:600;text-align:right;">${opts.projectName}</td>
                        </tr>
                        ${detailRows}
                    </table>
                </div>

                ${adminNoteHtml}
                ${ctaHtml}
            </div>
        </div>

        <!-- Footer -->
        <div style="margin-top:24px;text-align:center;color:#475569;font-size:12px;line-height:1.8;">
            <p style="margin:0;">Questions? Contact us at <a href="mailto:info@e3rentals.com" style="color:#d4a843;text-decoration:none;">info@e3rentals.com</a></p>
            <p style="margin:4px 0 0;">© ${new Date().getFullYear()} E3 Rentals. All rights reserved.</p>
        </div>
    </div>
</body>
</html>`;
}

// ─── Main Send Function ───────────────────────────────────────────────────────
export async function sendQuoteStatusEmail(opts: {
    to: string;
    customerName: string;
    projectName: string;
    projectId: string;
    status: string;
    startDate?: string;
    endDate?: string;
    totalPrice?: number | null;
    adminNote?: string;
}) {
    // Skip if no API key configured
    if (!process.env.RESEND_API_KEY || process.env.RESEND_API_KEY === "re_placeholder") {
        console.log(`[EMAIL SKIPPED] No RESEND_API_KEY. Would send "${opts.status}" to ${opts.to}`);
        return;
    }

    const cfg = STATUS_CONFIG[opts.status];
    if (!cfg) return; // Unknown status — skip quietly

    const extraRows: Array<{ label: string; value: string }> = [];
    if (opts.startDate) extraRows.push({ label: "Event Start", value: new Date(opts.startDate).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" }) });
    if (opts.endDate) extraRows.push({ label: "Event End", value: new Date(opts.endDate).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" }) });
    if (opts.totalPrice) extraRows.push({ label: "Total Amount", value: `QAR ${opts.totalPrice.toLocaleString()}` });

    const html = buildEmailHTML({
        customerName: opts.customerName,
        projectName: opts.projectName,
        status: opts.status,
        extraRows,
        adminNote: opts.adminNote,
    });

    if (!html) return;

    // Build CTA with projectId substituted
    const htmlWithId = html.replace(new RegExp(opts.projectName, "g"), opts.projectName)
        .replace(/ctaUrl\([^)]+\)/g, "");

    // Re-build properly with projectId for the CTA URL
    const finalHtml = buildEmailHTMLWithId(opts);
    if (!finalHtml) return;

    try {
        const resend = getResend();
        await resend.emails.send({
            from: FROM,
            to: opts.to,
            subject: cfg.subject,
            html: finalHtml,
        });
        console.log(`[EMAIL SENT] ${opts.status} → ${opts.to}`);
    } catch (err) {
        console.error("[EMAIL ERROR]", err);
        // Never throw — email failure should not break the booking update
    }
}

function buildEmailHTMLWithId(opts: {
    to: string;
    customerName: string;
    projectName: string;
    projectId: string;
    status: string;
    startDate?: string;
    endDate?: string;
    totalPrice?: number | null;
    adminNote?: string;
}) {
    const cfg = STATUS_CONFIG[opts.status];
    if (!cfg) return null;

    const extraRows: Array<{ label: string; value: string }> = [];
    if (opts.startDate) extraRows.push({ label: "Event Start", value: new Date(opts.startDate).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" }) });
    if (opts.endDate) extraRows.push({ label: "Event End", value: new Date(opts.endDate).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" }) });
    if (opts.totalPrice) extraRows.push({ label: "Total Amount", value: `QAR ${opts.totalPrice.toLocaleString()}` });

    const detailRows = extraRows.map(r => `
        <tr>
            <td style="padding:8px 0;color:#94a3b8;font-size:13px;">${r.label}</td>
            <td style="padding:8px 0;color:#f1f5f9;font-size:13px;font-weight:600;text-align:right;">${r.value}</td>
        </tr>
    `).join("");

    const ctaUrl = cfg.ctaUrl ? cfg.ctaUrl(opts.projectId) : BASE_URL;
    const accentColor = cfg.accentColor;

    const adminNoteHtml = opts.adminNote ? `
        <div style="margin-top:24px;background:#1e293b;border-left:3px solid ${accentColor};border-radius:0 8px 8px 0;padding:16px 20px;">
            <p style="margin:0 0 6px;font-size:12px;text-transform:uppercase;letter-spacing:1px;color:${accentColor};font-weight:700;">Note from our team</p>
            <p style="margin:0;color:#cbd5e1;font-size:14px;line-height:1.6;">${opts.adminNote}</p>
        </div>
    ` : "";

    return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#0a0f1e;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
    <div style="max-width:600px;margin:0 auto;padding:32px 16px;">
        <div style="text-align:center;margin-bottom:32px;">
            <div style="display:inline-block;background:linear-gradient(135deg,#d4a843,#f5c842);border-radius:12px;padding:12px 16px;margin-bottom:16px;">
                <span style="font-size:24px;font-weight:900;color:#0a0f1e;letter-spacing:2px;">E3 RENTALS</span>
            </div>
        </div>
        <div style="background:#0f1729;border:1px solid #1e293b;border-radius:16px;overflow:hidden;">
            <div style="background:${accentColor}18;border-bottom:1px solid ${accentColor}30;padding:24px 28px;text-align:center;">
                <div style="font-size:40px;margin-bottom:8px;">${cfg.emoji}</div>
                <h1 style="margin:0;color:#f1f5f9;font-size:22px;font-weight:700;">${cfg.headline}</h1>
                <p style="margin:8px 0 0;color:#94a3b8;font-size:14px;line-height:1.6;">${cfg.subtext}</p>
            </div>
            <div style="padding:28px;">
                <p style="margin:0 0 20px;color:#cbd5e1;font-size:15px;">Hi <strong style="color:#f1f5f9;">${opts.customerName}</strong>,</p>
                <div style="background:#1e293b;border-radius:10px;padding:16px 20px;">
                    <table style="width:100%;border-collapse:collapse;">
                        <tr>
                            <td style="padding:8px 0;color:#94a3b8;font-size:13px;">Project / Quote</td>
                            <td style="padding:8px 0;color:#f1f5f9;font-size:13px;font-weight:600;text-align:right;">${opts.projectName}</td>
                        </tr>
                        ${detailRows}
                    </table>
                </div>
                ${adminNoteHtml}
                <div style="margin-top:32px;text-align:center;">
                    <a href="${ctaUrl}" style="display:inline-block;background:${accentColor};color:#0a0f1e;font-weight:700;font-size:14px;padding:14px 32px;border-radius:10px;text-decoration:none;letter-spacing:0.5px;">
                        ${cfg.cta} →
                    </a>
                </div>
            </div>
        </div>
        <div style="margin-top:24px;text-align:center;color:#475569;font-size:12px;line-height:1.8;">
            <p style="margin:0;">Questions? Contact us at <a href="mailto:info@e3rentals.com" style="color:#d4a843;text-decoration:none;">info@e3rentals.com</a></p>
            <p style="margin:4px 0 0;">© ${new Date().getFullYear()} E3 Rentals. All rights reserved.</p>
        </div>
    </div>
</body>
</html>`;
}
