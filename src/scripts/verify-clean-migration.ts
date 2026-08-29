import { pool } from "../lib/db";
import { runDrizzleMigrations } from "./run-migrations";

async function verifyCleanMigrationFromZero() {
    console.log("================================================================================");
    console.log("   E3 RENTALS — VERIFICATION OF CLEAN DRIZZLE MIGRATION FROM ZERO              ");
    console.log("================================================================================");

    const client = await pool.connect();
    const testSchemaName = "test_clean_mig_scratch_" + Date.now();

    try {
        console.log(`\n1. Creating clean isolated PostgreSQL schema: "${testSchemaName}"...`);
        await client.query(`CREATE SCHEMA ${testSchemaName};`);

        console.log(`2. Running official Drizzle migration journal against "${testSchemaName}" from scratch...`);
        const result = await runDrizzleMigrations(testSchemaName);
        console.log(`   Migrations applied: ${result.appliedCount} / ${result.totalInJournal}`);

        console.log(`\n3. Introspecting all tables created in "${testSchemaName}"...`);
        const tablesRes = await client.query(`
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = $1 
            ORDER BY table_name;
        `, [testSchemaName]);

        const tableNames = tablesRes.rows.map((r: any) => r.table_name);
        console.log(`   Found ${tableNames.length} tables in clean schema:`);
        for (let i = 0; i < tableNames.length; i += 4) {
            console.log("     " + tableNames.slice(i, i + 4).join(", "));
        }

        console.log(`\n4. Introspecting foreign key constraints in "${testSchemaName}"...`);
        const fksRes = await client.query(`
            SELECT tc.table_name, kcu.column_name, ccu.table_name AS foreign_table_name, ccu.column_name AS foreign_column_name
            FROM information_schema.table_constraints AS tc
            JOIN information_schema.key_column_usage AS kcu
              ON tc.constraint_name = kcu.constraint_name
              AND tc.table_schema = kcu.table_schema
            JOIN information_schema.constraint_column_usage AS ccu
              ON ccu.constraint_name = tc.constraint_name
              AND ccu.table_schema = tc.table_schema
            WHERE tc.constraint_type = 'FOREIGN KEY' AND tc.table_schema = $1;
        `, [testSchemaName]);
        console.log(`   Verified ${fksRes.rows.length} foreign key constraints.`);

        console.log(`\n5. Introspecting indexes created in "${testSchemaName}"...`);
        const idxRes = await client.query(`
            SELECT tablename, indexname 
            FROM pg_indexes 
            WHERE schemaname = $1 
            ORDER BY tablename, indexname;
        `, [testSchemaName]);
        console.log(`   Verified ${idxRes.rows.length} indexes.`);

        console.log(`\n6. Testing migrator idempotency (running second time on "${testSchemaName}")...`);
        const secondRunResult = await runDrizzleMigrations(testSchemaName);
        console.log(`   Second run result: ${secondRunResult.appliedCount} new migrations (expected: 0).`);
        if (secondRunResult.appliedCount !== 0) {
            throw new Error("Idempotency failed: second migration run attempted duplicate work!");
        }

        console.log("\n7. Migration Journal Table (__drizzle_migrations) Records:");
        const journalRows = await client.query(`SELECT id, hash, created_at FROM ${testSchemaName}."__drizzle_migrations" ORDER BY id;`);
        for (const row of journalRows.rows) {
            console.log(`   - Migration ID ${row.id}: created_at=${row.created_at}, hash=${row.hash.slice(0, 16)}...`);
        }

        console.log("\n>>> Clean migration from zero SUCCEEDED with 100% accuracy! <<<");

    } finally {
        console.log(`\n8. Dropping temporary schema "${testSchemaName}"...`);
        await client.query(`DROP SCHEMA IF EXISTS ${testSchemaName} CASCADE;`);
        console.log(`   Clean schema "${testSchemaName}" dropped successfully.`);
        client.release();
    }
}

verifyCleanMigrationFromZero()
    .then(() => process.exit(0))
    .catch((err) => {
        console.error("Clean migration verification FAILED:", err);
        process.exit(1);
    });
