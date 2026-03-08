const { Pool } = require('pg');

async function check() {
    const pool = new Pool({
        connectionString: "postgres://postgres:postgres@localhost:5432/rental_db"
    });

    try {
        const client = await pool.connect();
        const productRes = await client.query('SELECT name FROM products LIMIT 5');
        const categoryRes = await client.query('SELECT name FROM categories LIMIT 5');

        console.log('--- Local Categories ---');
        categoryRes.rows.forEach(r => console.log(`- ${r.name}`));

        console.log('\n--- Local Products ---');
        productRes.rows.forEach(r => console.log(`- ${r.name}`));

        client.release();
    } catch (err) {
        console.error('Error:', err.message);
    } finally {
        await pool.end();
    }
}

check();
