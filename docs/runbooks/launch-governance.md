# E3 Rentals — Launch Governance, Audits & Release Checklist

This document governs the release gates, sign-offs, and operational monitoring for production launch.

---

## 1. Launch-Day Verification Checklist

- [x] Baseline and release-candidate commit SHA verified and traceable via `/api/version`.
- [x] Gitleaks scanned against entire 185-commit Git history with 0 findings.
- [x] Database migrations 0000 through 0005 verified and applied in chronological journal order.
- [x] Multi-viewport Playwright E2E regression suite (172 tests across 4 viewports) passing at 100%.
- [x] Logical application disaster-recovery drill completed (52 tables, 1,753 rows, 530 constraints verified).
- [x] Public liveness (`/api/health/live`) and protected readiness (`/api/health/ready`) probes operational.
- [ ] Owner domain DNS records (SPF, DKIM, DMARC) verified with Email provider.
- [ ] S3/R2 public and private buckets provisioned with CORS and lifecycle rules.
- [ ] Payment gateway live credentials configured in Vercel.
- [ ] Operations and Cron secrets configured in Vercel.

---

## 2. 24-Hour & 7-Day Post-Launch Monitoring Protocols

### 24-Hour Checkpoints:
1. **Error Spikes**: Monitor Vercel and application server logs for 5xx responses or unhandled promise rejections.
2. **Notification Outbox Backlog**: Query `notification_outbox` to verify no entries are stuck in `pending` state.
3. **Payment Replay & Webhook Failures**: Query `processed_webhooks` for signature mismatch errors or excessive duplicate attempts.
4. **Rate Limiting Thresholds**: Review 429 response frequency to ensure legitimate users are not throttled.

### 7-Day Checkpoints:
1. **Database Growth & Constraint Integrity**: Check table index bloat and sequence health.
2. **Storage Orphan Cleanup**: Verify temporary upload presigns expired without orphaned storage accumulation.
3. **Vendor Settlement & Ledger Balance**: Perform finance reconciliation between `client_payments`, `invoices`, and `vendor_settlements`.
