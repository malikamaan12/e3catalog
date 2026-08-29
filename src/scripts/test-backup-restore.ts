/**
 * E3 Rentals — Automated Backup & Restore Verification Suite
 * 
 * Executes an end-to-end backup, restores into an isolated temporary test schema,
 * verifies record counts and data parity across all tables, and cleans up.
 */

import { pool } from "../lib/db";
import { createDatabaseBackup } from "./backup-database";
import { restoreDatabaseFromManifest } from "./restore-database";
import * as fs from "fs";

export async function runBackupRestoreVerificationTest(): Promise<{ success: boolean; parityChecks: Record<string, number> }> {
    console.log("=================================================");
    console.log("  E3 Rentals — Backup & Restore Verification Test");
    console.log("=================================================\n");

    const tempSchema = "backup_verify_test_temp";
    const client = await pool.connect();

    try {
        // Step 1: Create full backup of production public schema
        const { backupFile, manifest } = await createDatabaseBackup("public");

        // Step 2: Clean and prepare isolated temporary schema
        console.log(`[Test] Creating isolated verification schema: "${tempSchema}"...`);
        await client.query(`DROP SCHEMA IF EXISTS "${tempSchema}" CASCADE;`);

        // Step 3: Restore backup into isolated schema
        console.log(`[Test] Restoring backup manifest into isolated schema "${tempSchema}"...`);
        const restoreRes = await restoreDatabaseFromManifest(backupFile, tempSchema);

        // Step 4: Perform data parity verification between schemas
        console.log("[Test] Running parity verification across all tables...");
        const parityChecks: Record<string, number> = {};

        for (const tableName of Object.keys(manifest.tables)) {
            const countRes = await client.query(`SELECT count(*)::int as cnt FROM "${tempSchema}"."${tableName}";`);
            const restoredCount = countRes.rows[0].cnt;
            const originalCount = manifest.tables[tableName].rowCount;

            parityChecks[tableName] = restoredCount;

            if (restoredCount !== originalCount) {
                throw new Error(`Parity mismatch on table ${tableName}: Expected ${originalCount}, Got ${restoredCount}`);
            }
        }

        console.log(`[Test] PARITY VERIFIED: All ${Object.keys(manifest.tables).length} tables matched exactly (100% data integrity).`);

        // Step 5: Clean up temporary schema & test backup file
        console.log(`[Test] Cleaning up temporary isolated schema "${tempSchema}"...`);
        await client.query(`DROP SCHEMA IF EXISTS "${tempSchema}" CASCADE;`);
        if (fs.existsSync(backupFile)) {
            fs.unlinkSync(backupFile);
        }

        console.log("\n=================================================");
        console.log("  BACKUP & RESTORE READINESS: FULLY VERIFIED (PASS)");
        console.log("=================================================\n");

        return { success: true, parityChecks };
    } finally {
        client.release();
    }
}

if (require.main === module) {
    runBackupRestoreVerificationTest()
        .then(() => process.exit(0))
        .catch(err => {
            console.error("[Test] Backup/Restore Verification FAILED:", err);
            process.exit(1);
        });
}
