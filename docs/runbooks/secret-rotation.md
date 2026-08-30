# E3 Rentals — Secret Rotation & Key Lifecycle Runbook

This runbook outlines the zero-downtime rotation procedures for credentials and signing keys.

---

## 1. Authentication Token Secret (`AUTHENTICATION_SECRET`)

- **Rotation Interval**: Every 90 days or immediately upon suspected compromise.
- **Downtime Impact**: Active user sessions will be required to re-authenticate on their next request.
- **Procedure**:
  1. Generate a new cryptographically secure 64-character hex secret:
     ```bash
     node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
     ```
  2. Update `AUTHENTICATION_SECRET` in Vercel Project Settings for Production and Preview environments.
  3. Redeploy master branch to trigger instant rollout.
  4. Verify login flow and session creation.

---

## 2. Payment Gateway Webhook Secret (`STRIPE_WEBHOOK_SECRET`)

- **Rotation Interval**: Annually or upon webhook endpoint updates.
- **Downtime Impact**: Zero (Stripe supports simultaneous dual webhook endpoints during rollout).
- **Procedure**:
  1. Create a new webhook signing secret in the payment provider dashboard.
  2. Update `STRIPE_WEBHOOK_SECRET` in Vercel.
  3. Redeploy application.
  4. Trigger a test event from the provider console and inspect `processed_webhooks` in the database.
  5. Delete the old webhook secret from the provider dashboard.

---

## 3. Database Connection URI (`DATABASE_URL`)

- **Rotation Interval**: Bi-annually or upon DBA personnel change.
- **Procedure**:
  1. Create a secondary role / connection pool in Supabase/PostgreSQL.
  2. Update `DATABASE_URL` in Vercel with the new role credentials.
  3. Trigger automated deployment.
  4. Execute `GET /api/health/ready` with `x-ops-secret` to verify healthy connectivity.
  5. Revoke old database credentials.
