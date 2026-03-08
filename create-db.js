const { Client } = require('pg');

async function createDb() {
    const client = new Client({
        connectionString: 'postgresql://postgres:postgres@localhost:5432/postgres'
    });

    try {
        await client.connect();
        // Check if the database already exists
        const res = await client.query("SELECT 1 FROM pg_database WHERE datname = 'rental_db'");
        if (res.rowCount === 0) {
            console.log('Creating database rental_db...');
            await client.query('CREATE DATABASE rental_db');
            console.log('Database rental_db created successfully.');
        } else {
            console.log('Database rental_db already exists.');
        }
    } catch (err) {
        console.error('Error creating database:', err);
        process.exit(1);
    } finally {
        await client.end();
    }
}

createDb();
