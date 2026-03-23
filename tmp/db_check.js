require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
    host: "aws-1-ap-northeast-1.pooler.supabase.com",
    port: 6543,
    user: "postgres.kwswkoysskkxuezbfmyt",
    password: "Malik12amaan@#",
    database: "postgres",
    ssl: { rejectUnauthorized: false },
});

async function check() {
    try {
        const res = await pool.query('SELECT * FROM inventory_units LIMIT 1');
        console.log("Unit Sample:", res.rows[0]);
        
        const logs = await pool.query('SELECT * FROM inspection_logs LIMIT 1');
        console.log("Log Sample:", logs.rows[0]);

        const assignments = await pool.query('SELECT * FROM booking_unit_assignments LIMIT 1');
        console.log("Assignment Sample:", assignments.rows[0]);

    } catch (e) {
        console.error(e);
    } finally {
        await pool.end();
    }
}

check();
