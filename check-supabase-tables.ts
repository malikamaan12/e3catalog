import pkg from 'pg';
const { Pool } = pkg;

async function checkTables() {
    const pool = new Pool({
        connectionString: "postgresql://postgres:Malik12amaan%40%23@db.kwswkoysskkxuezbfmyt.supabase.co:5432/postgres",
        ssl: { rejectUnauthorized: false }
    });

    try {
        const client = await pool.connect();
        const res = await client.query(`
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public'
        `);
        console.log('--- Tables in Supabase ---');
        if (res.rows.length === 0) {
            console.log('No tables found!');
        } else {
            res.rows.forEach(r => console.log(`- ${r.table_name}`));
        }
        client.release();
    } catch (err: any) {
        console.error('Error:', err.message);
    } finally {
        await pool.end();
    }
}

checkTables();
