import pkg from 'pg';
const { Pool } = pkg;

async function checkColumns() {
    const pool = new Pool({
        connectionString: "postgresql://postgres:Malik12amaan%40%23@db.kwswkoysskkxuezbfmyt.supabase.co:5432/postgres",
        ssl: { rejectUnauthorized: false }
    });

    try {
        const client = await pool.connect();
        const res = await client.query(`
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name = 'users'
        `);
        console.log('--- Columns in "users" table ---');
        res.rows.forEach(r => console.log(`- ${r.column_name} (${r.data_type})`));
        client.release();
    } catch (err: any) {
        console.error('Error:', err.message);
    } finally {
        await pool.end();
    }
}

checkColumns();
