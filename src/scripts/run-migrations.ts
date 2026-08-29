import { pool } from "../lib/db";
import * as fs from "fs";
import * as path from "path";
import * as crypto from "crypto";

export interface MigrationJournalEntry {
    idx: number;
    version: string;
    when: number;
    tag: string;
    breakpoints: boolean;
}

export interface MigrationJournal {
    version: string;
    dialect: string;
    entries: MigrationJournalEntry[];
}

export async function runDrizzleMigrations(customSchema?: string) {
    const targetSchema = customSchema || "public";
    console.log(`[Drizzle Migrator] Starting migrations for target schema: "${targetSchema}"...`);

    const client = await pool.connect();

    try {
        if (customSchema) {
            await client.query(`CREATE SCHEMA IF NOT EXISTS ${customSchema};`);
            await client.query(`SET search_path TO ${customSchema}, public;`);
        }

        // 1. Ensure official __drizzle_migrations table exists
        await client.query(`
            CREATE TABLE IF NOT EXISTS "__drizzle_migrations" (
                id SERIAL PRIMARY KEY,
                hash text NOT NULL,
                created_at bigint NOT NULL
            );
        `);

        // 2. Read migration journal
        const drizzleDir = path.resolve(process.cwd(), "drizzle");
        const journalPath = path.join(drizzleDir, "meta", "_journal.json");
        if (!fs.existsSync(journalPath)) {
            throw new Error(`Migration journal not found at ${journalPath}`);
        }

        const journal: MigrationJournal = JSON.parse(fs.readFileSync(journalPath, "utf-8"));
        
        // 3. Fetch already applied migrations
        let appliedRes = await client.query(`SELECT created_at, hash FROM "__drizzle_migrations" ORDER BY id;`);
        if (appliedRes.rows.length === 0) {
            // Check if this is an existing database schema with legacy tables
            const checkTable = await client.query(`
                SELECT table_name FROM information_schema.tables 
                WHERE table_schema = $1 AND table_name = 'admin_settings';
            `, [targetSchema]);

            if (checkTable.rows.length > 0) {
                // Seed historical migrations that are already present in existing database
                console.log(`[Drizzle Migrator] Existing database schema detected in "${targetSchema}". Synchronizing migration journal...`);
                await client.query(`
                    INSERT INTO "__drizzle_migrations" (hash, created_at) VALUES 
                    ('baseline_0000', 1773003815807),
                    ('baseline_0001', 1774298548295),
                    ('baseline_0002', 1788004533773);
                `);
                appliedRes = await client.query(`SELECT created_at, hash FROM "__drizzle_migrations" ORDER BY id;`);
            }
        }
        const appliedWhenSet = new Set<string>(appliedRes.rows.map((r: any) => String(r.created_at)));

        let appliedCount = 0;

        // 4. Apply pending migrations in strict journal sequence
        for (const entry of journal.entries) {
            const entryWhenStr = String(entry.when);
            if (appliedWhenSet.has(entryWhenStr)) {
                // Already applied
                continue;
            }

            const sqlFilePath = path.join(drizzleDir, `${entry.tag}.sql`);
            if (!fs.existsSync(sqlFilePath)) {
                throw new Error(`SQL migration file not found for tag: ${entry.tag} at ${sqlFilePath}`);
            }

            const sqlContent = fs.readFileSync(sqlFilePath, "utf-8");
            const hash = crypto.createHash("sha256").update(sqlContent).digest("hex");

            // Split into individual SQL statements by Drizzle statement-breakpoint
            const rawStatements = sqlContent.split(/-->\s*statement-breakpoint/g);
            const statements = rawStatements
                .map(s => s.trim())
                .filter(s => s.length > 0);

            console.log(`[Drizzle Migrator] Applying migration [${entry.idx}]: ${entry.tag} (${statements.length} statements)...`);

            await client.query("BEGIN;");
            try {
                for (const stmt of statements) {
                    await client.query(stmt);
                }

                // Record in migration journal table
                await client.query(
                    `INSERT INTO "__drizzle_migrations" (hash, created_at) VALUES ($1, $2);`,
                    [hash, entry.when]
                );

                await client.query("COMMIT;");
                appliedCount++;
                console.log(`[Drizzle Migrator] Successfully applied ${entry.tag}.`);
            } catch (migrationErr: any) {
                await client.query("ROLLBACK;");
                console.error(`[Drizzle Migrator] FAILED applying ${entry.tag}:`, migrationErr.message);
                throw migrationErr;
            }
        }

        // 5. Synchronize document sequences with any existing historical table rows
        const currentYear = new Date().getFullYear();
        const sequenceTargets = [
            { type: "invoice", table: "invoices", col: "invoice_number" },
            { type: "payment", table: "client_payments", col: "payment_number" },
            { type: "credit_note", table: "credit_notes", col: "credit_note_number" },
            { type: "refund", table: "refunds", col: "refund_number" },
            { type: "journal", table: "financial_journals", col: "journal_number" },
            { type: "payout", table: "vendor_payouts", col: "payout_number" },
            { type: "remittance", table: "vendor_remittances", col: "remittance_number" }
        ];

        for (const target of sequenceTargets) {
            try {
                const maxRes = await client.query(`
                    SELECT MAX(NULLIF(SPLIT_PART(${target.col}, '-', 3), '')::integer) AS max_val 
                    FROM ${target.table} 
                    WHERE ${target.col} LIKE '%${currentYear}%';
                `);
                const maxVal = maxRes.rows[0]?.max_val || 0;
                if (maxVal > 0) {
                    await client.query(`
                        INSERT INTO "document_sequences" ("document_type", "year", "current_value", "updated_at")
                        VALUES ($1, $2, $3, NOW())
                        ON CONFLICT ("document_type", "year")
                        DO UPDATE SET "current_value" = GREATEST("document_sequences"."current_value", EXCLUDED."current_value"), "updated_at" = NOW();
                    `, [target.type, currentYear, maxVal]);
                }
            } catch {
                // Table might not have records yet, safely ignore
            }
        }

        if (appliedCount === 0) {
            console.log("[Drizzle Migrator] Database is already up to date. No new migrations applied.");
        } else {
            console.log(`[Drizzle Migrator] Successfully applied ${appliedCount} new migration(s).`);
        }

        return { appliedCount, totalInJournal: journal.entries.length };
    } finally {
        if (customSchema) {
            await client.query(`SET search_path TO public;`);
        }
        client.release();
    }
}

if (require.main === module) {
    runDrizzleMigrations()
        .then(() => {
            console.log("[Drizzle Migrator] Completed migration process successfully.");
            process.exit(0);
        })
        .catch((err) => {
            console.error("[Drizzle Migrator] Fatal migration error:", err);
            process.exit(1);
        });
}
