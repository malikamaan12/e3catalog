import { NextRequest, NextResponse } from "next/server";
import { verifyPaymentWebhook, processVerifiedWebhookEvent } from "@/lib/payments";

export async function POST(
    req: NextRequest,
    context: { params: Promise<{ provider: string }> }
) {
    const { provider } = await context.params;
    const rawBody = await req.text();

    const signatureHeader = req.headers.get("stripe-signature") || req.headers.get("x-signature");
    const timestampHeader = req.headers.get("x-timestamp");

    const verification = await verifyPaymentWebhook(provider, {
        rawBody,
        signatureHeader,
        timestampHeader,
        toleranceSeconds: 300, // 5 min replay protection window
    });

    if (!verification.valid || !verification.event) {
        return NextResponse.json(
            { error: verification.error || "Webhook signature verification failed" },
            { status: 400 }
        );
    }

    try {
        const result = await processVerifiedWebhookEvent(provider, verification.event, rawBody);
        return NextResponse.json({
            received: true,
            id: verification.event.id,
            ...result,
        });
    } catch (err: any) {
        console.error(`[Webhook:${provider}] Processing error:`, err.message);
        return NextResponse.json({ error: "Failed to process webhook event" }, { status: 500 });
    }
}
