import Database from 'better-sqlite3';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Initialize DB directly with better-sqlite3 for altering
const db = new Database(join(__dirname, 'data', 'rental.db'));

try {
    console.log("Adding payment_status column to bookings table...");
    db.exec(`
        ALTER TABLE bookings ADD COLUMN payment_status TEXT NOT NULL DEFAULT 'unpaid';
    `);

    // Also simplify the active statuses to consolidate legacy statuses to the new 4-stage pipeline
    console.log("Consolidating legacy statuses in bookings table...");
    db.exec(`
        UPDATE bookings SET status = 'request' WHERE status = 'pending_quote';
    `);
    db.exec(`
        UPDATE bookings SET status = 'quote_sent' WHERE status IN ('changes_requested', 'quote_accepted', 'booking_requested');
    `);

    console.log("Migration successful.");
} catch (e) {
    console.log("Migration error (maybe column already exists):");
    console.log(e.message);
}

db.close();
