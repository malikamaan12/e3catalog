/**
 * alter-staging.mjs
 * ──────────────────
 * Run this script ONCE to create the staging_inventory table in Supabase.
 * Usage: node alter-staging.mjs
 */
import pg from "pg";
import { config } from "dotenv";

config({ path: ".env.local" });

const { Pool } = pg;

const pool = new Pool({
    host:     process.env.DB_HOST     || "aws-1-ap-northeast-1.pooler.supabase.com",
    port:     6543,
    user:     process.env.DB_USER     || "postgres.kwswkoysskkxuezbfmyt",
    password: process.env.DB_PASSWORD || "Malik12amaan@#",
    database: process.env.DB_NAME     || "postgres",
    ssl:      { rejectUnauthorized: false },
});

async function run() {
    const client = await pool.connect();
    try {
        console.log("🔌 Connected to database. Running staging migration...");

        await client.query("BEGIN");

        // 1. Create the staging_inventory table
        await client.query(`
            CREATE TABLE IF NOT EXISTS staging_inventory (
                id                   VARCHAR(255) PRIMARY KEY,
                vendor_id            VARCHAR(255) REFERENCES vendors(id) ON DELETE SET NULL,
                rough_name           VARCHAR(255) NOT NULL DEFAULT '',
                rough_image_url      VARCHAR(500),
                rough_category       VARCHAR(255),
                dimensions           VARCHAR(255),
                weight               VARCHAR(100),
                technical_notes      TEXT,
                counted_quantity     INTEGER NOT NULL DEFAULT 0,
                migration_status     VARCHAR(50) NOT NULL DEFAULT 'counting',
                migrated_product_id  VARCHAR(255) REFERENCES products(id) ON DELETE SET NULL,
                created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
            );
        `);
        console.log("  ✅ Table 'staging_inventory' created (or already exists).");

        // 2. Create indexes
        await client.query(`
            CREATE INDEX IF NOT EXISTS staging_inventory_vendor_id_idx
            ON staging_inventory (vendor_id);
        `);
        await client.query(`
            CREATE INDEX IF NOT EXISTS staging_inventory_status_idx
            ON staging_inventory (migration_status);
        `);
        console.log("  ✅ Indexes created.");

        // 3. Add a 'staging-uncategorized' category for migrations (idempotent)
        await client.query(`
            INSERT INTO categories (id, name, slug, active, sort_order)
            VALUES (
                'cat-staging-uncategorized',
                'Staging / Uncategorized',
                'staging-uncategorized',
                false,
                9999
            )
            ON CONFLICT (slug) DO NOTHING;
        `);
        console.log("  ✅ Staging category ensured.");

        await client.query("COMMIT");
        console.log("\n🎉 Staging migration complete!\n");
    } catch (err) {
        await client.query("ROLLBACK");
        console.error("❌ Migration failed:", err.message);
        process.exit(1);
    } finally {
        client.release();
        await pool.end();
    }
}

run();
