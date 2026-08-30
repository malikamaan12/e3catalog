# E3 Rentals — Disaster Recovery & Backup Runbook

This document defines the database backup mechanisms and recovery procedures.

---

## 1. Recovery Architecture Overview

E3 Rentals implements a dual backup strategy:

1. **Primary Production Disaster Recovery (Physical PostgreSQL Dump)**:
   - Tooling: Standard PostgreSQL `pg_dump` and `pg_restore` utilities.
   - Frequency: Daily automated snapshots via Supabase/PostgreSQL cluster backups + weekly offsite archiving.
   - Scope: Complete PostgreSQL cluster dump including all schemas, tables, constraints, indexes, sequences, extensions, and roles.

2. **Application Logical Snapshots**:
   - Tooling: `src/scripts/backup-database.ts` and `src/scripts/restore-database.ts`.
   - Frequency: Pre-deployment checkpoints and schema migration drills.
   - Scope: Logical JSON record exports with SHA-256 integrity checksums and Drizzle DDL migration playback.

---

## 2. Production PostgreSQL Backup & Restore Commands

### Creating a Full Database Dump:
```bash
# Create a compressed custom-format PostgreSQL dump
pg_dump --clean --if-exists --no-owner --no-privileges -Fc -d "$DATABASE_URL" -f "e3_production_$(date +%Y%m%d_%H%M%S).dump"
```

### Restoring into a Target Database Cluster:
```bash
# Restore full schema and data
pg_restore --clean --if-exists --no-owner --no-privileges -d "$TARGET_DATABASE_URL" "e3_production_backup.dump"
```

---

## 3. Logical Application Snapshot Commands

```bash
# Create logical application snapshot with SHA-256 checksum
npx tsx src/scripts/backup-database.ts

# Execute automated DR drill into isolated temporary schema
npx tsx src/scripts/test-backup-restore.ts
```
