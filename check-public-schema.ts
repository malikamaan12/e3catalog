import pkg from 'pg';
const { Pool } = pkg;

async function checkPublicTables() {
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
        console.log('--- Tables in "public" schema ---');
        if (res.rows.length === 0) {
            console.log('No tables found in public schema!');
        } else {
            res.rows.forEach(r => console.log(`- ${r.table_name}`));
        }

        // Check for "users" columns in public schema specifically
        const colRes = await client.query(`
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_schema = 'public' AND table_name = 'users'
        `);
        console.log('\n--- Columns in "public.users" ---');
        if (colRes.rows.length === 0) {
            console.log('Table "public.users" does not exist!');
        } else {
            colRes.rows.forEach(r => console.log(`- ${r.column_name} (${r.data_type})`));
        }

        client.release();
    } catch (err: any) {
        console.error('Error:', err.message);
    } finally {
        await pool.end();
    }
}

checkPublicTables();
