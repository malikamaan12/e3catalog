/**
 * E3 Rentals — Automated Database Backup Engine
 * 
 * Exports schema tables and row datasets with SHA-256 cryptographic verification.
 */

import { pool } from "../lib/db";
import * as fs from "fs";
import * as path from "path";
import * as crypto from "crypto";

export interface DatabaseBackupManifest {
    version: string;
    timestamp: string;
    schema: string;
    tableCount: number;
    totalRows: number;
    tables: Record<string, { rowCount: number; dataHash: string; rows: any[] }>;
    manifestChecksum: string;
}

export async function createDatabaseBackup(customSchema = "public", outputPath?: string): Promise<{ backupFile: string; manifest: DatabaseBackupManifest }> {
    const client = await pool.connect();

    try {
        console.log(`[DB Backup] Starting full database backup for schema: "${customSchema}"...`);

        // Fetch all tables in schema
        const tablesRes = await client.query(`
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = $1 AND table_type = 'BASE TABLE'
            ORDER BY table_name;
        `, [customSchema]);

        const tableNames = tablesRes.rows
            .map((r: any) => r.table_name)
            .filter((t: string) => !t.startsWith("__drizzle"));

        const tablesData: Record<string, { rowCount: number; dataHash: string; rows: any[] }> = {};
        let totalRows = 0;

        for (const tableName of tableNames) {
            const rowsRes = await client.query(`SELECT * FROM "${customSchema}"."${tableName}";`);
            const rows = rowsRes.rows;
            const serialized = JSON.stringify(rows);
            const dataHash = crypto.createHash("sha256").update(serialized).digest("hex");

            tablesData[tableName] = {
                rowCount: rows.length,
                dataHash,
                rows,
            };
            totalRows += rows.length;
        }

        const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
        const backupDir = path.resolve(process.cwd(), "tmp/backups");
        if (!fs.existsSync(backupDir)) {
            fs.mkdirSync(backupDir, { recursive: true });
        }

        const backupFilePath = outputPath || path.join(backupDir, `backup-${customSchema}-${timestamp}.json`);

        const partialManifest = {
            version: "1.0.0",
            timestamp: new Date().toISOString(),
            schema: customSchema,
            tableCount: tableNames.length,
            totalRows,
            tables: tablesData,
        };

        const manifestChecksum = crypto
            .createHash("sha256")
            .update(JSON.stringify(partialManifest))
            .digest("hex");

        const fullManifest: DatabaseBackupManifest = {
            ...partialManifest,
            manifestChecksum,
        };

        fs.writeFileSync(backupFilePath, JSON.stringify(fullManifest, null, 2), "utf-8");

        console.log(`[DB Backup] Successfully created backup of ${tableNames.length} tables (${totalRows} rows) at: ${backupFilePath}`);
        console.log(`[DB Backup] Checksum (SHA-256): ${manifestChecksum}`);

        return { backupFile: backupFilePath, manifest: fullManifest };
    } finally {
        client.release();
    }
}

if (require.main === module) {
    createDatabaseBackup().then(() => process.exit(0)).catch(err => {
        console.error("[DB Backup] Error:", err.message);
        process.exit(1);
    });
}
