import Database from 'better-sqlite3';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const db = new Database(join(__dirname, 'data', 'rental.db'));

try {
    console.log("Adding additional charge columns...");
    db.exec(`
        ALTER TABLE bookings ADD COLUMN additional_charge_name TEXT;
    `);
    db.exec(`
        ALTER TABLE bookings ADD COLUMN additional_charge_amount REAL DEFAULT 0;
    `);
    db.exec(`
        ALTER TABLE bookings ADD COLUMN additional_charge_type TEXT DEFAULT 'fixed';
    `);
} catch (e) {
    console.log("Error adding columns (might already exist):", e.message);
}

// Note: SQLite ALTER TABLE DROP COLUMN is supported in newer versions, 
// but we'll try it safely. If it fails, that's fine, the columns just go unused.
try {
    console.log("Cleaning up old charge columns...");
    db.exec(`ALTER TABLE bookings DROP COLUMN custom_fee;`);
    db.exec(`ALTER TABLE bookings DROP COLUMN tax_rate;`);
} catch (e) {
    console.log("Dropped columns manually not supported on this sqlite version or already dropped.", e.message);
}

console.log("Migration finished.");
db.close();
