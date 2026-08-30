# E3 Rentals — Production Environment Variables Matrix

This inventory defines all configuration parameters, their sensitivity classification, environment scope, rotation owner, validation rules, and current operational states.

> [!IMPORTANT]
> Never store secret values in this repository. All production credentials must be entered directly through the Vercel Project Environment Settings dashboard.

---

## 1. Complete Configuration Matrix

| Variable Name | Environment Scope | Owning Provider | Classification | Exposure Scope | Requirement | Validation Rule | Rotation Owner | Current State |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **`NODE_ENV`** | Dev, Preview, Prod | Runtime | Non-Secret | Server-Only | Required | Must be `development`, `production`, or `test` | DevOps | Configured |
| **`DATABASE_URL`** | Dev, Preview, Prod | PostgreSQL / Supabase | Secret | Server-Only | Required | Valid `postgres://` connection URI with pooler parameters | DBA / DevOps | Configured |
| **`AUTHENTICATION_SECRET`** | Dev, Preview, Prod | Next.js / Jose Auth | Secret | Server-Only | Required | High-entropy string `>= 32` characters | Security Lead | Configured (Dev Fallback in local) |
| **`JWT_SECRET`** | Dev, Preview, Prod | Jose Auth | Secret | Server-Only | Optional (Alias) | High-entropy string `>= 32` characters | Security Lead | Configured |
| **`OPS_SECRET`** | Preview, Prod | Operations API | Secret | Server-Only | Required | High-entropy token for authorized health inspections | DevOps | Pending Owner |
| **`CRON_SECRET`** | Preview, Prod | Background Worker | Secret | Server-Only | Required | Bearer token for Vercel cron triggers | DevOps | Pending Owner |
| **`NEXT_PUBLIC_APP_URL`** | Dev, Preview, Prod | Application | Non-Secret | Browser-Safe | Required | Valid HTTPS canonical URL (`https://e3catalog.vercel.app`) | DevOps | Configured |
| **`STORAGE_DRIVER`** | Dev, Preview, Prod | Storage Adapter | Non-Secret | Server-Only | Required | Must be `s3`, `local`, `disabled`, or `development fallback` | Platform Lead | Configured (`development fallback`) |
| **`S3_ACCESS_KEY_ID`** | Prod | AWS S3 / Cloudflare R2 | Secret | Server-Only | Optional | Alphanumeric API key | Cloud Admin | Disabled (Pending Owner) |
| **`S3_SECRET_ACCESS_KEY`** | Prod | AWS S3 / Cloudflare R2 | Secret | Server-Only | Optional | High-entropy secret key | Cloud Admin | Disabled (Pending Owner) |
| **`S3_REGION`** | Prod | AWS S3 / Cloudflare R2 | Non-Secret | Server-Only | Optional | Valid AWS region string (e.g. `me-central-1`, `auto`) | Cloud Admin | Disabled (Pending Owner) |
| **`S3_BUCKET_NAME`** | Prod | AWS S3 / Cloudflare R2 | Non-Secret | Server-Only | Optional | DNS-compliant bucket name for public catalog assets | Cloud Admin | Disabled (Pending Owner) |
| **`S3_PRIVATE_BUCKET_NAME`** | Prod | AWS S3 / Cloudflare R2 | Non-Secret | Server-Only | Optional | DNS-compliant bucket name for private KYC/invoices | Cloud Admin | Disabled (Pending Owner) |
| **`EMAIL_DRIVER`** | Dev, Preview, Prod | Email Adapter | Non-Secret | Server-Only | Required | Must be `resend`, `smtp`, `disabled`, or `development fallback` | Platform Lead | Configured (`development fallback`) |
| **`EMAIL_FROM`** | Prod | Domain Registrar | Non-Secret | Server-Only | Required in Prod | Valid RFC 5322 format with verified domain | Marketing / Admin | Pending Owner Domain |
| **`RESEND_API_KEY`** | Prod | Resend | Secret | Server-Only | Optional | Resend production API key (`re_...`) | Platform Lead | Disabled (Pending Owner) |
| **`PAYMENT_DRIVER`** | Dev, Preview, Prod | Payment Adapter | Non-Secret | Server-Only | Required | Must be `stripe`, `sadad`, `disabled`, or `development fallback` | Finance Lead | Configured (`development fallback`) |
| **`STRIPE_SECRET_KEY`** | Prod | Stripe | Secret | Server-Only | Optional | Stripe live secret key (`sk_live_...`) | Finance Lead | Disabled (Pending Decision) |
| **`STRIPE_WEBHOOK_SECRET`** | Prod | Stripe | Secret | Server-Only | Optional | Stripe webhook signing secret (`whsec_...`) | Platform Lead | Disabled (Pending Decision) |
| **`RATE_LIMIT_DRIVER`** | Dev, Preview, Prod | Rate Limiter | Non-Secret | Server-Only | Required | Must be `postgres`, `redis`, or `in-memory` | Platform Lead | Configured (`postgres`) |
| **`UPSTASH_REDIS_REST_URL`** | Prod | Upstash | Non-Secret | Server-Only | Optional | HTTPS REST endpoint for Upstash Redis | DevOps | Optional |
| **`UPSTASH_REDIS_REST_TOKEN`** | Prod | Upstash | Secret | Server-Only | Optional | REST token for Upstash Redis | DevOps | Optional |

---

## 2. Validation & Startup Invariants

1. **Zero Secret Leaks in Browser**: No server-only secrets start with `NEXT_PUBLIC_`.
2. **Strict Production Refusal**: If `NODE_ENV === "production"`, missing `AUTHENTICATION_SECRET` or missing database connection halts the server immediately during initialization.
3. **Provider Completeness Rule**: Partial configurations are rejected by Zod schema validation (e.g. providing `RESEND_API_KEY` without `EMAIL_FROM` forces driver to `disabled`).
