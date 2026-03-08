import Database from 'better-sqlite3';
import path from 'path';

const DB_PATH = path.join(process.cwd(), "data", "rental.db");

async function migrate() {
    try {
        console.log('Adding "unit" column to "products" table at', DB_PATH);
        const db = new Database(DB_PATH);

        db.exec(`
      ALTER TABLE products ADD COLUMN unit TEXT NOT NULL DEFAULT 'unit'
    `);

        console.log('Migration successful!');
        db.close();
    } catch (error) {
        if (error.message.includes('duplicate column name')) {
            console.log('Column "unit" already exists.');
        } else {
            console.error('Migration failed:', error);
        }
    } finally {
        process.exit(0);
    }
}

migrate();
