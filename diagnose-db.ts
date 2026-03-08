import pkg from 'pg';
const { Pool } = pkg;

async function diagnose() {
    const pool = new Pool({
        connectionString: "postgresql://postgres:Malik12amaan%40%23@db.kwswkoysskkxuezbfmyt.supabase.co:5432/postgres",
        ssl: { rejectUnauthorized: false }
    });

    try {
        console.log('Connecting to Supabase...');
        const client = await pool.connect();
        console.log('Connected. Running query on "users" table...');

        try {
            const res = await client.query('SELECT * FROM users LIMIT 1');
            console.log('Query successful. Rows found:', res.rowCount);
        } catch (queryErr) {
            console.error('--- Query Failed ---');
            console.error('Message:', queryErr.message);
            console.error('Code:', queryErr.code);
            console.error('Detail:', queryErr.detail);
            console.error('Hint:', queryErr.hint);
            console.error('Table:', queryErr.table);
        }

        client.release();
    } catch (connErr) {
        console.error('--- Connection Failed ---');
        console.error(connErr.message);
    } finally {
        await pool.end();
    }
}

diagnose();
