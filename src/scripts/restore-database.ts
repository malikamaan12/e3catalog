/**
 * E3 Rentals — Automated Database Restore Engine
 * 
 * Restores schema and table datasets from a validated backup manifest.
 */

import { pool } from "../lib/db";
import { runDrizzleMigrations } from "./run-migrations";
import * as fs from "fs";
import * as crypto from "crypto";
import { DatabaseBackupManifest } from "./backup-database";

export async function restoreDatabaseFromManifest(
    backupFilePath: string,
    targetSchema = "public"
): Promise<{ restoredTables: number; restoredRows: number; verifiedChecksum: boolean }> {
    if (!fs.existsSync(backupFilePath)) {
        throw new Error("Backup file not found at " + backupFilePath);
    }

    const manifest: DatabaseBackupManifest = JSON.parse(fs.readFileSync(backupFilePath, "utf-8"));

    // Verify manifest integrity checksum
    const { manifestChecksum, ...payload } = manifest;
    const computedChecksum = crypto
        .createHash("sha256")
        .update(JSON.stringify(payload))
        .digest("hex");

    if (manifestChecksum !== computedChecksum) {
        throw new Error("Backup manifest checksum mismatch: File has been corrupted or altered");
    }

    console.log("[DB Restore] Verified backup checksum: " + manifestChecksum.substring(0, 12) + "...");
    console.log("[DB Restore] Preparing target schema: \"" + targetSchema + "\"...");

    // Run official migrations to create schema and tables in target schema
    await runDrizzleMigrations(targetSchema);

    const client = await pool.connect();

    try {
        await client.query("BEGIN;");
        await client.query("SET CONSTRAINTS ALL DEFERRED;");

        let restoredTables = 0;
        let restoredRows = 0;

        for (const [tableName, tableInfo] of Object.entries(manifest.tables)) {
            if (tableInfo.rows.length === 0) {
                restoredTables++;
                continue;
            }

            // Verify table hash
            const serialized = JSON.stringify(tableInfo.rows);
            const hash = crypto.createHash("sha256").update(serialized).digest("hex");
            if (hash !== tableInfo.dataHash) {
                throw new Error("Data corruption detected in table " + tableName);
            }

            const columns = Object.keys(tableInfo.rows[0]);
            const colList = columns.map(c => '"' + c + '"').join(", ");

            const chunkSize = 50;
            for (let i = 0; i < tableInfo.rows.length; i += chunkSize) {
                const chunk = tableInfo.rows.slice(i, i + chunkSize);
                const values: any[] = [];
                const valueClauses: string[] = [];

                let paramIdx = 1;
                for (const row of chunk) {
                    const rowParams: string[] = [];
                    for (const c of columns) {
                        const val = row[c];
                        if (val !== null && typeof val === "object" && !(val instanceof Date)) {
                            values.push(JSON.stringify(val));
                        } else {
                            values.push(val);
                        }
                        rowParams.push("$" + (paramIdx++));
                    }
                    valueClauses.push("(" + rowParams.join(", ") + ")");
                }

                const queryStr = 'INSERT INTO "' + targetSchema + '"."' + tableName + '" (' + colList + ') VALUES ' + valueClauses.join(", ") + ' ON CONFLICT DO NOTHING;';
                await client.query(queryStr, values);
                restoredRows += chunk.length;
            }

            restoredTables++;
        }

        await client.query("COMMIT;");
        console.log("[DB Restore] Successfully restored " + restoredTables + " tables (" + restoredRows + " rows) into schema \"" + targetSchema + "\".");

        return {
            restoredTables,
            restoredRows,
            verifiedChecksum: true,
        };
    } catch (err: any) {
        await client.query("ROLLBACK;");
        throw err;
    } finally {
        client.release();
    }
}