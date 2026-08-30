# E3 Rentals — Production Integrations Activation Runbook

This runbook provides step-by-step instructions for activating third-party production services.

> [!IMPORTANT]
> Never hardcode credentials into source files, commit secrets into Git, or provide live credentials in chat.
> All production secrets must be configured directly in the Vercel Project Settings environment interface.

---

## 1. Required Owner-Supplied Configuration Parameters

| Category | Parameter Name | Description | Status |
| :--- | :--- | :--- | :--- |
| **Domain** | `NEXT_PUBLIC_APP_URL` | Approved production canonical URL (e.g. `https://app.yourdomain.com`) | Required |
| **Authentication** | `AUTHENTICATION_SECRET` | High-entropy secret string (min 32 chars) for signing session tokens | Required |
| **Database** | `DATABASE_URL` or `DB_HOST` | Production PostgreSQL / Supabase pooler connection parameters | Configured |
| **Email** | `EMAIL_FROM` | Approved verified sender domain/address (e.g. `E3 Rentals <noreply@yourdomain.com>`) | Pending Owner |
| **Email** | `RESEND_API_KEY` | Live Resend API key with domain DKIM/SPF configured | Pending Owner |
| **Storage** | `S3_BUCKET_NAME` | Approved public asset bucket name | Pending Owner |
| **Storage** | `S3_PRIVATE_BUCKET_NAME` | Approved private documents bucket name | Pending Owner |
| **Storage** | `S3_ACCESS_KEY_ID` | AWS S3 / Cloudflare R2 access key | Pending Owner |
| **Storage** | `S3_SECRET_ACCESS_KEY` | AWS S3 / Cloudflare R2 secret access key | Pending Owner |
| **Payments** | `PAYMENT_DRIVER` | Chosen gateway (`stripe` or `sadad`) | Pending Decision |
| **Payments** | `STRIPE_SECRET_KEY` | Production Stripe Secret Key | Pending Owner |
| **Payments** | `STRIPE_WEBHOOK_SECRET` | Production Stripe Webhook Signing Secret | Pending Owner |
| **Rate Limit** | `UPSTASH_REDIS_REST_URL` | Upstash Redis REST URL (optional; Postgres limiter is active) | Optional |
| **Security** | `CRON_SECRET` | High-entropy secret for authenticating automated cron workers | Required |
| **Operations** | `OPS_SECRET` | Secret token for authorized `/api/health/ready` status inspection | Required |

---

## 2. Activation Procedures

### A. Email Provider Activation (Resend)
1. Verify sender domain DNS records (SPF, DKIM, DMARC) in Resend Dashboard.
2. Configure environment variables in Vercel:
   ```env
   EMAIL_DRIVER=resend
   RESEND_API_KEY=YOUR_VERIFIED_RESEND_API_KEY
   EMAIL_FROM="E3 Rentals <noreply@YOUR_VERIFIED_DOMAIN.com>"
   ```

### B. Object Storage Activation (AWS S3 / Cloudflare R2)
1. Provision public and private buckets with appropriate CORS policies.
2. Configure environment variables in Vercel:
   ```env
   STORAGE_DRIVER=s3
   S3_ACCESS_KEY_ID=YOUR_S3_ACCESS_KEY_ID
   S3_SECRET_ACCESS_KEY=YOUR_S3_SECRET_ACCESS_KEY
   S3_REGION=YOUR_S3_REGION
   S3_BUCKET_NAME=YOUR_PUBLIC_BUCKET_NAME
   S3_PRIVATE_BUCKET_NAME=YOUR_PRIVATE_BUCKET_NAME
   ```

### C. Payment Gateway Activation (Stripe)
1. Configure webhook endpoint in Stripe Dashboard pointing to `https://YOUR_DOMAIN/api/webhooks/payments/stripe`.
2. Select events: `payment_intent.succeeded`, `payment_intent.payment_failed`.
3. Configure environment variables in Vercel:
   ```env
   PAYMENT_DRIVER=stripe
   STRIPE_SECRET_KEY=YOUR_STRIPE_LIVE_SECRET_KEY
   STRIPE_WEBHOOK_SECRET=YOUR_STRIPE_WEBHOOK_SECRET
   NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=YOUR_STRIPE_PUBLISHABLE_KEY
   ```
