import Database from 'better-sqlite3';

const db = new Database('data/rental.db');

try {
    // Add new fields to bookings table
    console.log("Adding labor_cost...");
    db.prepare('ALTER TABLE bookings ADD COLUMN labor_cost REAL DEFAULT 0').run();

    console.log("Adding custom_fee...");
    db.prepare('ALTER TABLE bookings ADD COLUMN custom_fee REAL DEFAULT 0').run();

    console.log("Adding admin_notes...");
    db.prepare('ALTER TABLE bookings ADD COLUMN admin_notes TEXT').run();

    console.log("Adding client_notes...");
    db.prepare('ALTER TABLE bookings ADD COLUMN client_notes TEXT').run();

    // Note: 'status' is already TEXT, we just added new valid string values
    // update existing 'request' to 'pending_quote' to match the new lifecycle terminology
    console.log("Migrating older 'request' statuses to 'pending_quote'...");
    db.prepare("UPDATE bookings SET status = 'pending_quote' WHERE status = 'request'").run();

    console.log("Migration complete.");
} catch (error) {
    console.error("Migration failed:", error.message);
} finally {
    db.close();
}
