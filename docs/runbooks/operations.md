# E3 Rentals — Production Operations Runbook

## Overview
This runbook provides platform engineers and DevOps operators with standard operating procedures for operating, scaling, monitoring, and maintaining the E3 Rentals production platform.

---

## 1. System Architecture & Topology
- **Application Framework**: Next.js 16 (React 19, Turbopack, App Router) hosted on Vercel Serverless / Edge Infrastructure.
- **Database Layer**: PostgreSQL (Supabase Managed Cluster) accessed via connection pool (`pg`) and typed queries with Drizzle ORM.
- **Cache & Rate Limiting**: Distributed PostgreSQL Sliding Window with optional Upstash Redis token bucket.
- **Storage Layer**: AWS S3 / Cloudflare R2 object storage with private bucket isolation for contracts, KYC, and financial manifests.
- **Email Dispatcher**: Resend API with fallback to persistent database outbox.

---

## 2. Health Probes & Monitoring
The platform exposes standardized container and cloud health probes:

- **Liveness Ping**: `GET /api/health/live` (Returns HTTP 200 `{"status": "live"}`)
- **Deep Readiness Probe**: `GET /api/health/ready`
  - Checks live database latency (`SELECT 1`)
  - Evaluates active storage, email, and payment driver status
  - Inspects notification outbox queue backlog and pending delivery counters

---

## 3. Secret Management & Hygiene
- Secrets must never be committed to Git or logged in plaintext.
- Use `src/scripts/scan-secrets.ts` to enforce pre-commit and CI hygiene:
  ```bash
  npx tsx src/scripts/scan-secrets.ts
  ```
- All application logs pass through `src/lib/logger.ts` which automatically redacts passwords, tokens, API keys, CVVs, and IBANs.

---

## 4. Background Job & Cron Execution
Background notification dispatching and retries are executed via scheduled HTTP POST triggers protected by `CRON_SECRET`:
- Endpoint: `POST /api/cron/process-notifications`
- Header: `Authorization: Bearer <CRON_SECRET>` or `x-cron-secret: <CRON_SECRET>`
- Frequency: Every 1 to 5 minutes
