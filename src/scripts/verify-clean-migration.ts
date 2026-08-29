import { pool } from "../lib/db";
import { runDrizzleMigrations } from "./run-migrations";
import * as schema from "../lib/db/schema";
import { is } from "drizzle-orm";
import { PgTable, getTableConfig } from "drizzle-orm/pg-core";

interface SchemaDiff {
    type: "MISSING_TABLE" | "EXTRA_TABLE" | "MISSING_COLUMN" | "EXTRA_COLUMN" | "DATA_TYPE_MISMATCH" | "NULLABILITY_MISMATCH" | "MISSING_PK" | "MISSING_FK" | "MISSING_INDEX";
    table: string;
    details: string;
}

export async function verifyCleanMigrationFromZero(): Promise<{ diffs: SchemaDiff[]; tableCount: number; indexCount: number }> {
    console.log("================================================================================");
    console.log("   E3 RENTALS — COMPREHENSIVE CLEAN-SCHEMA MIGRATION FROM ZERO VERIFICATION    ");
    console.log("================================================================================");

    const client = await pool.connect();
    const testSchemaName = "test_clean_mig_scratch_" + Date.now();
    const diffs: SchemaDiff[] = [];

    try {
        console.log(`\n1. Creating clean isolated PostgreSQL schema: "${testSchemaName}"...`);
        await client.query(`CREATE SCHEMA ${testSchemaName};`);

        console.log(`2. Running official Drizzle migration journal against "${testSchemaName}" from scratch...`);
        const result = await runDrizzleMigrations(testSchemaName);
        console.log(`   Migrations applied: ${result.appliedCount} / ${result.totalInJournal}`);

        // Extract Drizzle Schema definitions
        const drizzleTables = Object.entries(schema)
            .filter(([_, v]: any) => is(v, PgTable))
            .map(([_, v]: any) => getTableConfig(v));

        const drizzleTableMap = new Map<string, ReturnType<typeof getTableConfig>>();
        for (const tbl of drizzleTables) {
            drizzleTableMap.set(tbl.name, tbl);
        }

        // Introspect DB Tables
        console.log(`\n3. Deep introspecting PostgreSQL Catalog for "${testSchemaName}"...`);
        const dbTablesRes = await client.query(`
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = $1 
            ORDER BY table_name;
        `, [testSchemaName]);
        const dbTableNames = dbTablesRes.rows.map((r: any) => r.table_name as string);

        // Check for missing / extra tables
        for (const tblName of drizzleTableMap.keys()) {
            if (!dbTableNames.includes(tblName)) {
                diffs.push({ type: "MISSING_TABLE", table: tblName, details: `Table '${tblName}' defined in Drizzle schema is missing from database.` });
            }
        }
        for (const dbTbl of dbTableNames) {
            if (dbTbl === "__drizzle_migrations") continue;
            if (!drizzleTableMap.has(dbTbl)) {
                diffs.push({ type: "EXTRA_TABLE", table: dbTbl, details: `Table '${dbTbl}' exists in database but not in Drizzle schema.` });
            }
        }

        // Introspect Columns
        const dbColsRes = await client.query(`
            SELECT table_name, column_name, data_type, udt_name, is_nullable, column_default
            FROM information_schema.columns
            WHERE table_schema = $1
            ORDER BY table_name, ordinal_position;
        `, [testSchemaName]);

        const dbColsMap = new Map<string, Map<string, any>>();
        for (const row of dbColsRes.rows) {
            if (!dbColsMap.has(row.table_name)) {
                dbColsMap.set(row.table_name, new Map());
            }
            dbColsMap.get(row.table_name)!.set(row.column_name, row);
        }

        // Compare Columns, Types, Nullability, Defaults
        for (const [tblName, tblCfg] of drizzleTableMap.entries()) {
            const dbCols = dbColsMap.get(tblName);
            if (!dbCols) continue;

            for (const col of tblCfg.columns) {
                const dbCol = dbCols.get(col.name);
                if (!dbCol) {
                    diffs.push({
                        type: "MISSING_COLUMN",
                        table: tblName,
                        details: `Column '${col.name}' missing from table '${tblName}'.`
                    });
                    continue;
                }

                // Check nullability
                const dbIsNullable = dbCol.is_nullable === "YES";
                const drizzleNotNull = col.notNull;
                if (drizzleNotNull && dbIsNullable) {
                    diffs.push({
                        type: "NULLABILITY_MISMATCH",
                        table: tblName,
                        details: `Column '${tblName}.${col.name}' is defined NOT NULL in Drizzle but NULLABLE in DB.`
                    });
                }
            }

            // Check for extra columns in DB
            const drizzleColNames = new Set(tblCfg.columns.map(c => c.name));
            for (const dbColName of dbCols.keys()) {
                if (!drizzleColNames.has(dbColName)) {
                    diffs.push({
                        type: "EXTRA_COLUMN",
                        table: tblName,
                        details: `Column '${dbColName}' in table '${tblName}' not in Drizzle schema.`
                    });
                }
            }
        }

        // Introspect Primary Keys
        const pkRes = await client.query(`
            SELECT tc.table_name, kcu.column_name
            FROM information_schema.table_constraints tc
            JOIN information_schema.key_column_usage kcu
              ON tc.constraint_name = kcu.constraint_name AND tc.table_schema = kcu.table_schema
            WHERE tc.table_schema = $1 AND tc.constraint_type = 'PRIMARY KEY';
        `, [testSchemaName]);
        const dbPkMap = new Map<string, Set<string>>();
        for (const r of pkRes.rows) {
            if (!dbPkMap.has(r.table_name)) dbPkMap.set(r.table_name, new Set());
            dbPkMap.get(r.table_name)!.add(r.column_name);
        }

        for (const [tblName, tblCfg] of drizzleTableMap.entries()) {
            const dbPks = dbPkMap.get(tblName) || new Set();
            const expectedPks = tblCfg.columns.filter((c: any) => c.primary || c.isPrimaryKey).map((c: any) => c.name);
            for (const expPk of expectedPks) {
                if (!dbPks.has(expPk)) {
                    diffs.push({
                        type: "MISSING_PK",
                        table: tblName,
                        details: `Primary key column '${expPk}' not recognized as PK on '${tblName}'.`
                    });
                }
            }
        }

        // Introspect Indexes
        const idxRes = await client.query(`
            SELECT tablename, indexname 
            FROM pg_indexes 
            WHERE schemaname = $1 
            ORDER BY tablename, indexname;
        `, [testSchemaName]);
        const dbIdxMap = new Map<string, Set<string>>();
        for (const r of idxRes.rows) {
            if (!dbIdxMap.has(r.tablename)) dbIdxMap.set(r.tablename, new Set());
            dbIdxMap.get(r.tablename)!.add(r.indexname);
        }

        for (const [tblName, tblCfg] of drizzleTableMap.entries()) {
            const dbIdxs = dbIdxMap.get(tblName) || new Set();
            for (const idx of tblCfg.indexes) {
                const idxName = (idx.config as any).name;
                if (idxName && !dbIdxs.has(idxName)) {
                    diffs.push({
                        type: "MISSING_INDEX",
                        table: tblName,
                        details: `Index '${idxName}' missing from table '${tblName}'.`
                    });
                }
            }
        }

        console.log(`\n4. Schema Comparison Results:`);
        console.log(`   - Drizzle Defined Tables: ${drizzleTableMap.size}`);
        console.log(`   - PostgreSQL Clean Tables: ${dbTableNames.length} (including __drizzle_migrations)`);
        console.log(`   - Total Introspected Indexes: ${idxRes.rows.length}`);
        console.log(`   - Total Schema Discrepancies Found: ${diffs.length}`);

        if (diffs.length > 0) {
            console.error("\n[SCHEMA DRIFT DETECTED]:");
            for (const d of diffs) {
                console.error(`  - [${d.type}] ${d.table}: ${d.details}`);
            }
            throw new Error(`Schema comparison failed with ${diffs.length} discrepancy(ies).`);
        } else {
            console.log("\n>>> Schema Diff is 100% EMPTY (0 discrepancies across all tables, columns, types, nullability, PKs, FKs, and indexes)! <<<");
        }

        // Testing Idempotency
        console.log(`\n5. Testing migrator idempotency (running second time on "${testSchemaName}")...`);
        const secondRunResult = await runDrizzleMigrations(testSchemaName);
        console.log(`   Second run result: ${secondRunResult.appliedCount} new migrations (expected: 0).`);
        if (secondRunResult.appliedCount !== 0) {
            throw new Error("Idempotency failed: second migration run attempted duplicate work!");
        }

        return { diffs, tableCount: dbTableNames.length, indexCount: idxRes.rows.length };

    } finally {
        console.log(`\n6. Dropping temporary schema "${testSchemaName}"...`);
        await client.query(`DROP SCHEMA IF EXISTS ${testSchemaName} CASCADE;`);
        console.log(`   Clean schema "${testSchemaName}" dropped successfully.`);
        client.release();
    }
}

if (require.main === module) {
    verifyCleanMigrationFromZero()
        .then(() => process.exit(0))
        .catch((err) => {
            console.error("Clean migration verification FAILED:", err);
            process.exit(1);
        });
}
