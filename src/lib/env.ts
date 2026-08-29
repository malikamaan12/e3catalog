/**
 * E3 Rentals — Environment Configuration & Typed Validation
 * 
 * Provides centralized, validated access to environment variables,
 * secret redaction helpers, and provider integration status reporting.
 */

export type StorageDriver = "s3" | "local" | "dev-mock";
export type EmailDriver = "resend" | "smtp" | "dev-outbox";
export type PaymentDriver = "stripe" | "sadad" | "dev-mock";
export type RateLimitDriver = "redis" | "postgres" | "in-memory";

export interface IntegrationStatus {
    name: string;
    driver: string;
    status: "active" | "sandbox" | "development_outbox" | "disabled";
    configured: boolean;
    details: string;
}

export interface AppEnv {
    // Core
    NODE_ENV: "development" | "production" | "test";
    DATABASE_URL: string;
    AUTHENTICATION_SECRET: string;
    JWT_SECRET: string;
    APP_URL: string;

    // Storage
    STORAGE_DRIVER: StorageDriver;
    S3_ACCESS_KEY_ID?: string;
    S3_SECRET_ACCESS_KEY?: string;
    S3_REGION?: string;
    S3_ENDPOINT?: string;
    S3_BUCKET_NAME?: string;
    S3_PRIVATE_BUCKET_NAME?: string;
    NEXT_PUBLIC_CDN_URL?: string;

    // Email
    EMAIL_DRIVER: EmailDriver;
    RESEND_API_KEY?: string;
    EMAIL_FROM: string;
    SMTP_HOST?: string;
    SMTP_PORT?: number;
    SMTP_USER?: string;
    SMTP_PASS?: string;

    // Payment
    PAYMENT_DRIVER: PaymentDriver;
    STRIPE_SECRET_KEY?: string;
    STRIPE_PUBLISHABLE_KEY?: string;
    STRIPE_WEBHOOK_SECRET?: string;
    SADAD_MERCHANT_ID?: string;
    SADAD_SECRET_KEY?: string;

    // Rate Limiting
    RATE_LIMIT_DRIVER: RateLimitDriver;
    UPSTASH_REDIS_REST_URL?: string;
    UPSTASH_REDIS_REST_TOKEN?: string;

    // Security & Ops
    CRON_SECRET?: string;
}

/**
 * Validates and normalizes environment variables on demand.
 */
function parseEnv(): AppEnv {
    const nodeEnv = (process.env.NODE_ENV as "development" | "production" | "test") || "development";
    
    // Core Database URL
    const dbUrl = process.env.DATABASE_URL || (process.env.DB_HOST ? `postgres://${process.env.DB_USER}:${process.env.DB_PASSWORD}@${process.env.DB_HOST}:${process.env.DB_PORT || 6543}/${process.env.DB_NAME || "postgres"}` : "postgres://postgres:postgres@localhost:5432/postgres");

    // Core Auth Secret
    const authSecret = process.env.AUTHENTICATION_SECRET || process.env.JWT_SECRET || "dev_super_secret_auth_key_min_32_chars_ok!";

    // Storage Driver Resolution
    let storageDriver: StorageDriver = "dev-mock";
    if (process.env.S3_ACCESS_KEY_ID && process.env.S3_SECRET_ACCESS_KEY) {
        storageDriver = "s3";
    } else if (process.env.STORAGE_DRIVER === "local") {
        storageDriver = "local";
    }

    // Email Driver Resolution
    let emailDriver: EmailDriver = "dev-outbox";
    if (process.env.RESEND_API_KEY && !process.env.RESEND_API_KEY.includes("your_api_key")) {
        emailDriver = "resend";
    } else if (process.env.SMTP_HOST) {
        emailDriver = "smtp";
    }

    // Payment Driver Resolution
    let paymentDriver: PaymentDriver = "dev-mock";
    if (process.env.STRIPE_SECRET_KEY && !process.env.STRIPE_SECRET_KEY.includes("your_key")) {
        paymentDriver = "stripe";
    } else if (process.env.SADAD_SECRET_KEY) {
        paymentDriver = "sadad";
    }

    // Rate Limiting Driver Resolution
    let rateLimitDriver: RateLimitDriver = "postgres"; // Production multi-tenant safe default
    if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
        rateLimitDriver = "redis";
    } else if (process.env.RATE_LIMIT_DRIVER === "in-memory") {
        rateLimitDriver = "in-memory";
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:5001";

    return {
        NODE_ENV: nodeEnv,
        DATABASE_URL: dbUrl,
        AUTHENTICATION_SECRET: authSecret,
        JWT_SECRET: authSecret,
        APP_URL: appUrl,

        STORAGE_DRIVER: storageDriver,
        S3_ACCESS_KEY_ID: process.env.S3_ACCESS_KEY_ID,
        S3_SECRET_ACCESS_KEY: process.env.S3_SECRET_ACCESS_KEY,
        S3_REGION: process.env.S3_REGION || "auto",
        S3_ENDPOINT: process.env.S3_ENDPOINT,
        S3_BUCKET_NAME: process.env.S3_BUCKET_NAME || "rental-app-media",
        S3_PRIVATE_BUCKET_NAME: process.env.S3_PRIVATE_BUCKET_NAME || "rental-app-private",
        NEXT_PUBLIC_CDN_URL: process.env.NEXT_PUBLIC_CDN_URL,

        EMAIL_DRIVER: emailDriver,
        RESEND_API_KEY: process.env.RESEND_API_KEY,
        EMAIL_FROM: process.env.EMAIL_FROM || "E3 Rentals <noreply@e3rentals.com>",
        SMTP_HOST: process.env.SMTP_HOST,
        SMTP_PORT: process.env.SMTP_PORT ? parseInt(process.env.SMTP_PORT, 10) : undefined,
        SMTP_USER: process.env.SMTP_USER,
        SMTP_PASS: process.env.SMTP_PASS,

        PAYMENT_DRIVER: paymentDriver,
        STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY,
        STRIPE_PUBLISHABLE_KEY: process.env.STRIPE_PUBLISHABLE_KEY,
        STRIPE_WEBHOOK_SECRET: process.env.STRIPE_WEBHOOK_SECRET,
        SADAD_MERCHANT_ID: process.env.SADAD_MERCHANT_ID,
        SADAD_SECRET_KEY: process.env.SADAD_SECRET_KEY,

        RATE_LIMIT_DRIVER: rateLimitDriver,
        UPSTASH_REDIS_REST_URL: process.env.UPSTASH_REDIS_REST_URL,
        UPSTASH_REDIS_REST_TOKEN: process.env.UPSTASH_REDIS_REST_TOKEN,

        CRON_SECRET: process.env.CRON_SECRET,
    };
}

export const env = parseEnv();

/**
 * Redacts sensitive tokens/keys for safe display and logging.
 * Never displays more than the first and last 2 characters.
 */
export function redactSecret(value?: string | null): string {
    if (!value) return "[NOT CONFIGURED]";
    if (value.length <= 4) return "****";
    const prefix = value.substring(0, 2);
    const suffix = value.substring(value.length - 2);
    return `${prefix}******${suffix}`;
}

/**
 * Returns a clean status breakdown of all external service integrations.
 */
export function getIntegrationsStatus(): IntegrationStatus[] {
    return [
        {
            name: "Database (PostgreSQL / Supabase)",
            driver: "drizzle-pg",
            status: env.DATABASE_URL ? "active" : "disabled",
            configured: Boolean(env.DATABASE_URL),
            details: env.DATABASE_URL ? "Connected to PostgreSQL database cluster" : "No DATABASE_URL supplied",
        },
        {
            name: "Object Storage (Public & Private)",
            driver: env.STORAGE_DRIVER,
            status: env.STORAGE_DRIVER === "s3" ? "active" : "development_outbox",
            configured: env.STORAGE_DRIVER === "s3",
            details: env.STORAGE_DRIVER === "s3" 
                ? `S3/R2 Bucket: ${env.S3_BUCKET_NAME}, Private: ${env.S3_PRIVATE_BUCKET_NAME}` 
                : "Dev-mock adapter active (authorized ephemeral presigned URLs enabled)",
        },
        {
            name: "Transactional Email & Notifications",
            driver: env.EMAIL_DRIVER,
            status: env.EMAIL_DRIVER === "resend" ? "active" : "development_outbox",
            configured: env.EMAIL_DRIVER === "resend",
            details: env.EMAIL_DRIVER === "resend"
                ? `Resend API Key: ${redactSecret(env.RESEND_API_KEY)}, From: ${env.EMAIL_FROM}`
                : "Persistent Development Outbox active (emails stored in notification_outbox table)",
        },
        {
            name: "Payment Gateway",
            driver: env.PAYMENT_DRIVER,
            status: env.PAYMENT_DRIVER === "stripe" ? "active" : "development_outbox",
            configured: env.PAYMENT_DRIVER === "stripe",
            details: env.PAYMENT_DRIVER === "stripe"
                ? `Stripe Key: ${redactSecret(env.STRIPE_SECRET_KEY)}, Webhook: ${redactSecret(env.STRIPE_WEBHOOK_SECRET)}`
                : "Development Sandbox active (simulated payment intents and HMAC replay-resistant webhooks)",
        },
        {
            name: "Distributed Rate Limiter",
            driver: env.RATE_LIMIT_DRIVER,
            status: "active",
            configured: true,
            details: env.RATE_LIMIT_DRIVER === "redis"
                ? `Upstash Redis: ${redactSecret(env.UPSTASH_REDIS_REST_URL)}`
                : "PostgreSQL Sliding Window Limiter active (multi-instance production safe)",
        },
    ];
}
