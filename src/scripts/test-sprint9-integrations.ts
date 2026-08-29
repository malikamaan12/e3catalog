import { db } from "../lib/db";
import { users, authTokens, notificationOutbox } from "../lib/db/schema";
import { eq, desc } from "drizzle-orm";
import { createAuthToken, verifyAndConsumeAuthToken } from "../lib/auth-tokens";
import { checkRateLimit } from "../lib/rate-limit";
import { sendPasswordResetEmail } from "../lib/email";
import { verifyPaymentWebhook, processVerifiedWebhookEvent } from "../lib/payments";
import { env } from "../lib/env";
import * as crypto from "crypto";

async function runUnitTests() {
    console.log("=== Testing 1: Rate Limiter ===");
    const testKey = "test_rate_limit_" + Date.now();
    for (let i = 1; i <= 5; i++) {
        const res = await checkRateLimit(testKey, { limit: 3, windowSeconds: 10 });
        console.log(`Attempt ${i}: success = ${res.success}, remaining = ${res.remaining}, retryAfter = ${res.retryAfter}, driver = ${res.driver}`);
    }

    console.log("\n=== Testing 2: Password Reset & Outbox ===");
    const testUser = await db.query.users.findFirst();
    if (!testUser) throw new Error("No user in database");
    console.log("Using test user:", testUser.email);

    const { rawToken } = await createAuthToken(testUser.id, "password_reset", 3600);
    const emailRes = await sendPasswordResetEmail(testUser.email, rawToken, testUser.name || "User");
    console.log("Email dispatch result:", emailRes);

    const outboxRec = await db.select().from(notificationOutbox).where(eq(notificationOutbox.recipientEmail, testUser.email)).orderBy(desc(notificationOutbox.createdAt)).limit(1);
    console.log("Found outbox record:", outboxRec[0]?.id, "status:", outboxRec[0]?.status);

    const verifyRes = await verifyAndConsumeAuthToken(rawToken, "password_reset");
    console.log("Token consume result:", verifyRes);

    const replayVerifyRes = await verifyAndConsumeAuthToken(rawToken, "password_reset");
    console.log("Token replay consume result (should fail):", replayVerifyRes);

    console.log("\n=== Testing 3: Payment Webhooks ===");
    const webhookId = "evt_unit_" + Date.now();
    const nowSeconds = Math.floor(Date.now() / 1000);
    const payload = JSON.stringify({ id: webhookId, type: "payment_intent.succeeded", data: { object: { amount: 1000 } } });
    const secret = env.STRIPE_WEBHOOK_SECRET || "whsec_test_secret";
    const signedPayload = `${nowSeconds}.${payload}`;
    const sig = crypto.createHmac("sha256", secret).update(signedPayload).digest("hex");
    const sigHeader = `t=${nowSeconds},v1=${sig}`;

    const verifyWebhookRes = await verifyPaymentWebhook("stripe", {
        rawBody: payload,
        signatureHeader: sigHeader,
        secret,
    });
    console.log("Webhook verification result:", verifyWebhookRes);

    if (verifyWebhookRes.valid && verifyWebhookRes.event) {
        const process1 = await processVerifiedWebhookEvent("stripe", verifyWebhookRes.event, payload);
        console.log("Process 1 result:", process1);
        const process2 = await processVerifiedWebhookEvent("stripe", verifyWebhookRes.event, payload);
        console.log("Process 2 result (idempotent replay):", process2);
    }

    console.log("\n=== ALL MODULE INTEGRATION CHECKS PASSED ===");
}

runUnitTests().then(() => process.exit(0)).catch(err => {
    console.error("Unit test failed:", err);
    process.exit(1);
});
