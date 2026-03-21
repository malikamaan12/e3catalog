import { Pool } from "pg";

const pool = new Pool({
    host: "aws-1-ap-northeast-1.pooler.supabase.com",
    port: 6543,
    user: "postgres.kwswkoysskkxuezbfmyt",
    password: "Malik12amaan@#",
    database: "postgres",
    ssl: { rejectUnauthorized: false },
});

async function checkColumns() {
    try {
        const res = await pool.query(`
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name = 'users';
        `);
        console.log("Users table columns:", res.rows.map(r => r.column_name));
    } catch (e) {
        console.error(e);
    } finally {
        await pool.end();
    }
}

checkColumns();
