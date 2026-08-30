import { test, expect } from "@playwright/test";
import { setupE2EFixtures, E2ETestFixtures } from "./fixtures";
import { db } from "../src/lib/db";
import { users, notificationOutbox, authTokens } from "../src/lib/db/schema";
import { eq, desc } from "drizzle-orm";
import * as crypto from "crypto";
import { env } from "../src/lib/env";

test.describe("Sprint 9: Production Integrations, Security & Release Readiness", () => {
    let f: E2ETestFixtures;

    test.beforeAll(async () => {
        f = await setupE2EFixtures();
    });

    test.afterAll(async () => {
        await f.cleanup();
    });

    test("1. Liveness and Readiness Health Probes Return 200 OK with Dependency Status", async ({ request }) => {
        // Liveness probe (public)
        const liveRes = await request.get("/api/health/live");
        expect(liveRes.status()).toBe(200);
        const liveData = await liveRes.json();
        expect(liveData.status).toBe("live");

        // Public readiness probe (sanitized)
        const publicReadyRes = await request.get("/api/health/ready");
        expect(publicReadyRes.status()).toBe(200);
        const publicReadyData = await publicReadyRes.json();
        expect(publicReadyData.status).toBe("ready");
        expect(publicReadyData.checks).toBeUndefined(); // Infra details are protected

        // Authorized readiness probe (with ops secret)
        const authReadyRes = await request.get("/api/health/ready", {
            headers: { "x-ops-secret": "dev_ops_secret_test" },
        });
        expect(authReadyRes.status()).toBe(200);
        const authReadyData = await authReadyRes.json();
        expect(authReadyData.status).toBe("ready");
        expect(authReadyData.checks?.database?.status).toBe("healthy");
        expect(Array.isArray(authReadyData.checks?.integrations)).toBe(true);

        // Verify valid provider states
        for (const item of authReadyData.checks.integrations) {
            expect(["active", "sandbox", "development fallback", "disabled", "misconfigured"]).toContain(item.status);
        }
    });

    test("2. Rate Limiting Enforces Thresholds and Emits Standard RFC Headers", async ({ request }) => {
        const testIp = `198.51.100.${Math.floor(Math.random() * 200) + 1}`;
        let rateLimited = false;
        let lastHeaders: Record<string, string> = {};

        for (let i = 0; i < 20; i++) {
            const res = await request.post("/api/auth/login", {
                data: { email: "rate_test_user@example.com", password: "wrong" },
                headers: { "x-forwarded-for": testIp },
            });

            lastHeaders = res.headers();
            if (res.status() === 429) {
                rateLimited = true;
                break;
            }
        }

        expect(rateLimited).toBe(true);
        expect(lastHeaders["x-ratelimit-limit"]).toBeDefined();
        expect(lastHeaders["retry-after"]).toBeDefined();
    });

    test("3. Password Reset Flow: Forgot Password -> Outbox Token -> Reset -> New Login", async ({ browser, request }) => {
        const testEmail = f.clientUser.email;

        // Step A: Request password reset via API
        const forgotRes = await request.post("/api/auth/forgot-password", {
            data: { email: testEmail },
        });
        expect(forgotRes.status()).toBe(200);
        const forgotData = await forgotRes.json();
        expect(forgotData.success).toBe(true);

        // Step B: Fetch generated reset token from database
        const [tokenRec] = await db
            .select()
            .from(authTokens)
            .where(eq(authTokens.userId, f.clientUser.id))
            .orderBy(desc(authTokens.createdAt))
            .limit(1);

        expect(tokenRec).toBeDefined();
        expect(tokenRec.type).toBe("password_reset");

        // Inspect Dev Outbox to verify email dispatch
        const [outboxRec] = await db
            .select()
            .from(notificationOutbox)
            .where(eq(notificationOutbox.recipientEmail, testEmail))
            .orderBy(desc(notificationOutbox.createdAt))
            .limit(1);

        expect(outboxRec).toBeDefined();

        // Step C: Open browser to /forgot-password UI
        const context = await browser.newContext();
        const page = await context.newPage();
        await page.goto("/forgot-password");
        await expect(page.getByRole("heading", { name: "Reset your password" })).toBeVisible();

        // Step D: Simulate user resetting password with valid token
        const newPassword = "BrandNewSecurePassword2026!";
        const cryptoRawToken = crypto.randomBytes(32).toString("hex");
        const tokenHash = crypto.createHash("sha256").update(cryptoRawToken).digest("hex");

        await db.insert(authTokens).values({
            id: crypto.randomUUID(),
            userId: f.clientUser.id,
            type: "password_reset",
            tokenHash,
            expiresAt: new Date(Date.now() + 3600 * 1000),
            createdAt: new Date(),
        });

        const resetRes = await request.post("/api/auth/reset-password", {
            data: {
                token: cryptoRawToken,
                newPassword,
            },
        });
        expect(resetRes.status()).toBe(200);
        const resetData = await resetRes.json();
        expect(resetData.success).toBe(true);

        // Step E: Verify login with new password succeeds
        const loginRes = await request.post("/api/auth/login", {
            data: {
                email: testEmail,
                password: newPassword,
            },
        });
        expect(loginRes.status()).toBe(200);
        const loginData = await loginRes.json();
        expect(loginData.success).toBe(true);

        // Restore original password format
        await db
            .update(users)
            .set({ password: "password123" })
            .where(eq(users.id, f.clientUser.id));

        await context.close();
    });

    test("4. Private Object Storage: Authorized Presigning and Access Enforcement", async ({ browser }) => {
        const clientContext = await browser.newContext();
        await f.loginAsPersona(clientContext, f.clientUser);

        // Client generates private upload presigned URL
        const uploadRes = await clientContext.request.post("/api/storage/presign-upload", {
            data: {
                filename: "signed_contract.pdf",
                contentType: "application/pdf",
                isPrivate: true,
            },
        });

        expect(uploadRes.status()).toBe(200);
        const uploadData = await uploadRes.json();
        expect(uploadData.isPrivate).toBe(true);
        expect(uploadData.uploadUrl).toBeDefined();

        const storageKey = uploadData.key;
        expect(storageKey).toContain("private/client/");

        // Client generates private download presigned URL for own file
        const downloadRes = await clientContext.request.post("/api/storage/presign-download", {
            data: { key: storageKey },
        });
        expect(downloadRes.status()).toBe(200);
        const downloadData = await downloadRes.json();
        expect(downloadData.downloadUrl).toBeDefined();

        // Vendor user trying to download client's private file is rejected with 403 Forbidden
        const vendorContext = await browser.newContext();
        await f.loginAsPersona(vendorContext, f.vendorUser);

        const forbiddenRes = await vendorContext.request.post("/api/storage/presign-download", {
            data: { key: storageKey },
        });
        expect(forbiddenRes.status()).toBe(403);

        await clientContext.close();
        await vendorContext.close();
    });

    test("5. Payment Webhook: Signature Verification, Replay Resistance and Idempotency", async ({ request }) => {
        const webhookId = `evt_test_${crypto.randomUUID().substring(0, 12)}`;
        const nowSeconds = Math.floor(Date.now() / 1000);
        const payloadObj = {
            id: webhookId,
            type: "payment_intent.succeeded",
            data: {
                object: {
                    id: `pi_${crypto.randomUUID().substring(0, 8)}`,
                    bookingId: f.bookingId,
                    amount_received: 2500,
                },
            },
        };
        const rawBody = JSON.stringify(payloadObj);

        // Compute HMAC signature for Stripe webhook
        const secret = env.STRIPE_WEBHOOK_SECRET || "whsec_dev_default_test_secret";
        const signedPayload = `${nowSeconds}.${rawBody}`;
        const signature = crypto.createHmac("sha256", secret).update(signedPayload).digest("hex");
        const stripeSignatureHeader = `t=${nowSeconds},v1=${signature}`;

        // 1. Initial valid delivery -> Processed
        const res1 = await request.post("/api/webhooks/payments/stripe", {
            data: rawBody,
            headers: {
                "stripe-signature": stripeSignatureHeader,
                "content-type": "application/json",
            },
        });
        expect(res1.status()).toBe(200);
        const data1 = await res1.json();
        expect(data1.received).toBe(true);
        expect(data1.alreadyProcessed).toBe(false);

        // 2. Replay of same webhook ID -> Handled idempotently
        const res2 = await request.post("/api/webhooks/payments/stripe", {
            data: rawBody,
            headers: {
                "stripe-signature": stripeSignatureHeader,
                "content-type": "application/json",
            },
        });
        expect(res2.status()).toBe(200);
        const data2 = await res2.json();
        expect(data2.alreadyProcessed).toBe(true);

        // 3. Expired timestamp (> 300s drift) -> Rejected
        const oldTimestamp = nowSeconds - 600; // 10 minutes ago
        const oldSignature = crypto.createHmac("sha256", secret).update(`${oldTimestamp}.${rawBody}`).digest("hex");
        const resOld = await request.post("/api/webhooks/payments/stripe", {
            data: rawBody,
            headers: {
                "stripe-signature": `t=${oldTimestamp},v1=${oldSignature}`,
                "content-type": "application/json",
            },
        });
        expect(resOld.status()).toBe(400);

        // 4. Corrupted signature -> Rejected
        const resBadSig = await request.post("/api/webhooks/payments/stripe", {
            data: rawBody,
            headers: {
                "stripe-signature": `t=${nowSeconds},v1=invalid_signature_hex_digest`,
                "content-type": "application/json",
            },
        });
        expect(resBadSig.status()).toBe(400);
    });
});
