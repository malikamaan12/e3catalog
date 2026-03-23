/**
 * One-time script to clear hardcoded /images/products/* URLs from the products table.
 * Run with: npx tsx src/lib/db/clearHardcodedImages.ts
 */
import pkg from 'pg';
const { Pool } = pkg;

const pool = new Pool({
    host: "aws-1-ap-northeast-1.pooler.supabase.com",
    port: 5432,
    user: "postgres.kwswkoysskkxuezbfmyt",
    password: "Malik12amaan@#",
    database: "postgres",
    ssl: { rejectUnauthorized: false },
});

async function clearHardcodedImages() {
    const client = await pool.connect();
    try {
        console.log("🧹 Clearing hardcoded product images...\n");

        const result = await client.query(`
            UPDATE products
            SET thumbnail_url = '', updated_at = NOW()
            WHERE thumbnail_url LIKE '/images/products/%'
        `);

        console.log(`✅ Cleared ${result.rowCount} product(s) with hardcoded image URLs.`);
    } finally {
        client.release();
        await pool.end();
    }
}

clearHardcodedImages().catch(err => {
    console.error("❌ Failed:", err.message);
    process.exit(1);
});
