# E3 Rentals — Disaster Recovery & Backup Runbook

## Overview
This runbook defines the backup procedures, Point-in-Time Recovery (PITR) strategy, and emergency restore protocols for E3 Rentals.

---

## 1. Automated Backup Procedures
Database backups capture all 52 tables with full row-level cryptographic SHA-256 digests.

### Creating an On-Demand Backup:
```bash
npx tsx src/scripts/backup-database.ts
```
- Backups are stored in `tmp/backups/backup-<schema>-<timestamp>.json`
- Each backup file includes a cryptographic `manifestChecksum` covering all table datasets.

---

## 2. Automated Schema & Database Restore
The restore engine automatically runs Drizzle migration journals up to the latest revision and inserts validated table data.

### Restoring into a Target Schema / Database:
```bash
npx tsx -e "import { restoreDatabaseFromManifest } from './src/scripts/restore-database'; restoreDatabaseFromManifest('tmp/backups/backup-public-<timestamp>.json', 'public');"
```

---

## 3. Backup Verification Testing
Before any major release or schema migration, run the automated verification test:
```bash
npx tsx src/scripts/test-backup-restore.ts
```
This test:
1. Takes a full live backup of `public`.
2. Creates an isolated temporary schema `backup_verify_test_temp`.
3. Runs all 6 migration files against the temporary schema.
4. Restores the full backup manifest into the temporary schema.
5. Verifies 100% table and row count parity.
6. Cleans up and destroys the test schema.
