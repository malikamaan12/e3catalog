# E3 Rentals — Production Integrations Activation Guide

## Overview
This document specifies the exact environment variables and third-party configuration steps required to activate live production integrations.

---

## 1. Email Service (Resend)
To switch from Development Outbox mode to live email delivery:
1. Obtain an API key from [Resend Console](https://resend.com/api-keys).
2. Configure DNS SPF, DKIM, and DMARC records for `e3rentals.com`.
3. Set environment variables:
   ```env
   EMAIL_DRIVER=resend
   RESEND_API_KEY=re_live_xxxxxxxxxxxxxxxxxxxxxxxx
   EMAIL_FROM="E3 Rentals <notifications@e3rentals.com>"
   ```

---

## 2. Object Storage (AWS S3 or Cloudflare R2)
To switch from development storage to private cloud buckets:
1. Create two private S3/R2 buckets:
   - `e3-rentals-media` (public catalog assets)
   - `e3-rentals-vault-private` (private contracts, KYC, invoices)
2. Create IAM User with restricted `s3:PutObject`, `s3:GetObject`, and `s3:DeleteObject` policies.
3. Set environment variables:
   ```env
   STORAGE_DRIVER=s3
   S3_ACCESS_KEY_ID=AKIAxxxxxxxxxxxxxxxx
   S3_SECRET_ACCESS_KEY=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
   S3_BUCKET_NAME=e3-rentals-media
   S3_PRIVATE_BUCKET_NAME=e3-rentals-vault-private
   S3_REGION=me-central-1
   ```

---

## 3. Payment Gateway (Stripe / Sadad)
To activate live card processing and replay-resistant webhooks:
1. Set up Stripe account or Sadad Qatar merchant account.
2. In Stripe Dashboard > Webhooks, add endpoint `https://e3catalog.vercel.app/api/webhooks/payments/stripe`.
3. Set environment variables:
   ```env
   PAYMENT_DRIVER=stripe
   STRIPE_SECRET_KEY=your_stripe_live_secret_key_here
   STRIPE_WEBHOOK_SECRET=your_stripe_webhook_secret_here
   NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=your_stripe_publishable_key_here
   ```

---

## 4. Distributed Redis (Upstash)
To activate Redis-backed rate limiting across globally distributed Vercel Edge nodes:
1. Create a database on [Upstash Redis Console](https://console.upstash.com).
2. Set environment variables:
   ```env
   RATE_LIMIT_DRIVER=redis
   UPSTASH_REDIS_REST_URL=https://xxxx.upstash.io
   UPSTASH_REDIS_REST_TOKEN=xxxxxxxxxxxx
   ```
